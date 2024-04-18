/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, Repository, Like, Not, IsNull } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { Empresa } from '../entities/empresa.entity';
import { CreateCompanyDto, UpdateCompanyDto } from '../dtos/empresa.dto';
import { FilterCompanyDto } from '../dtos/filter.dto';

const expectedHeadersFile = [
  'f',
  'empresa',
  'cuit',
  'correo electrónico',
  'teléfono',
  'nombre de contacto',
  'estado',
  'seguimiento',
  'fecha de adhesion',
  'declaración jurada',
  'pv registro',
];

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa) private empresaRepo: Repository<Empresa>,
  ) {}

  async create(data: CreateCompanyDto) {
    const company = await this.empresaRepo.findOne({
      where: {
        nombre: Like(`%${data.nombre}%`),
        cuit: Like(`%${data.cuit}%`),
      },
    });
    if (company) throw new BadRequestException('Nombre y Cuil en uso');
    const newCompany = this.empresaRepo.create(data);
    return this.empresaRepo.save(newCompany);
  }

  async update(id: number, changes: UpdateCompanyDto) {
    const company = await this.empresaRepo.findOne(id);
    if (!company) {
      throw new NotFoundException();
    }
    this.empresaRepo.merge(company, changes);
    return this.empresaRepo.save(company);
  }

  async remove(id: number) {
    const company = await this.empresaRepo.findOne(id);
    if (!company) {
      throw new NotFoundException();
    }
    return this.empresaRepo.update(id, { deletedAt: new Date() });
  }

  async findOne(id: number) {
    const company = await this.empresaRepo.findOne(id);
    if (!company) {
      throw new NotFoundException();
    }
    return company;
  }

  async findOneWithRelations(id: number, ...relations: string[]) {
    const company = await this.empresaRepo.findOne(id, { relations });
    if (!company) {
      throw new NotFoundException();
    }
    return company;
  }

  async disableOldBulks() {
    await this.empresaRepo.update(
      { cargaMasiva: Not(IsNull()) },
      { isActive: false },
    );
  }

  async updateOrCreate(empresa: string, cuit: string, data) {
    const company = await this.empresaRepo.findOne({
      where: {
        nombre: Like(`%${empresa}%`),
        cuit: Like(`%${cuit}%`),
        deletedAt: IsNull(),
      },
    });
    if (company) {
      this.empresaRepo.merge(company, data);
      return this.empresaRepo.save(company);
    } else {
      const newCompany = this.empresaRepo.create(data);
      return this.empresaRepo.save(newCompany);
    }
  }

  findActives() {
    return this.empresaRepo.find({
      where: { isActive: true, deletedAt: IsNull() },
    });
  }

  findAll(params?: FilterCompanyDto) {
    if (params) {
      const where: FindConditions<Empresa> = {};
      const { limit, offset } = params;
      const { nombre, cuit, email, estado } = params;
      if (nombre) where.nombre = Like(`%${nombre}%`);
      if (cuit) where.cuit = Like(`%${cuit}%`);
      if (email) where.email = Like(email);
      if (estado) where.estado = Like(estado);
      // NO esten borradas
      where.deletedAt = IsNull();
      if (!limit) {
        return this.empresaRepo.find({ where });
      }
      return this.empresaRepo.find({
        where,
        take: limit,
        skip: offset,
      });
    }
    return this.empresaRepo.find();
  }

  #validateHedersOrder(arr1: Array<string>, arr2: Array<string>) {
    if (arr1.length !== arr2.length) {
      return false; // Si los arreglos tienen diferente longitud, no pueden tener el mismo orden
    }
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false; // Si algún elemento no coincide, los arreglos no tienen el mismo orden
      }
    }
    return true; // Si llega hasta aquí, los arreglos tienen los mismos elementos en el mismo orden
  }

  #formatText(text) {
    if (typeof text == 'object') {
      const { richText } = text;
      let formatedText = '';
      richText.forEach((value) => (formatedText += value.text));
      return formatedText.trim();
    }
    return text;
  }

  async bulkCreate(file: Express.Multer.File) {
    let workbook = new ExcelJS.Workbook();
    workbook = await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.worksheets[0];
    // Validar maximo de filas
    if (worksheet.rowCount > 255) {
      console.log(`Numero de filas ${worksheet.rowCount}`);
      throw new BadRequestException('El número máximo de filas es 255');
    }
    // Validar encabezados
    const headersData = [];
    const firstRow = worksheet.getRow(1);
    // Iterar sobre cada celda en la fila
    firstRow.eachCell({ includeEmpty: false }, function (cell) {
      // Acceder al valor de la celda
      headersData.push(cell.value.toString().toLowerCase().trim());
    });
    const missingFields = expectedHeadersFile.filter(
      (field) => !headersData.includes(field),
    );

    if (missingFields.length) {
      const errors = missingFields.map((field) => `Falta la columna ${field}`);
      throw new BadRequestException(errors);
    }
    // Validar orden de columnas
    const isOrdered = this.#validateHedersOrder(
      expectedHeadersFile,
      headersData,
    );
    if (!isOrdered) {
      throw new BadRequestException('Las columnas no están ordenadas');
    }
    const dataRows = worksheet.getRows(2, worksheet.rowCount);

    // Desactivar empresas antiguas de carga masiva
    await this.disableOldBulks();

    for (const row of dataRows) {
      const empresa = row.getCell(2).text;
      if (!empresa) break;
      const cuit = row.getCell(3).text;
      const email = row.getCell(4).text;
      const telefono = row.getCell(5).text;
      const nombreContacto = row.getCell(6).text;
      const estado = row.getCell(7).text;
      const seguimiento = row.getCell(8).text;
      const fechaAdhesion = row.getCell(9).text;
      const declaracionJurada = row.getCell(10).text;
      const pvRegistro = row.getCell(11).text;
      const isActive = true;
      const cargaMasiva = new Date();

      const data = {
        nombre: this.#formatText(empresa),
        cuit: this.#formatText(cuit),
        email: this.#formatText(email),
        telefono: this.#formatText(telefono),
        nombreContacto: this.#formatText(nombreContacto),
        estado: estado ? estado.toString().toUpperCase() : 'ADHERIDO',
        seguimiento: this.#formatText(seguimiento),
        fechaAdhesion: this.#formatText(fechaAdhesion),
        declaracionJurada: this.#formatText(declaracionJurada),
        pvRegistro: this.#formatText(pvRegistro),
        isActive,
        cargaMasiva,
      };

      await this.updateOrCreate(
        this.#formatText(empresa),
        this.#formatText(cuit),
        data,
      );
    }
    return {
      message: 'Carga completada con éxito',
      error: null,
      statusCode: HttpStatus.CREATED,
    };
  }
}
