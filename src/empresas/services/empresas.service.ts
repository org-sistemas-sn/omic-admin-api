/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, Like, IsNull } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { Empresa } from '../entities/empresa.entity';
import { CreateCompanyDto, UpdateCompanyDto } from '../dtos/empresa.dto';
import { FilterCompanyDto } from '../dtos/filter.dto';

const expectedHeadersFile = [
  'razón social',
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
    const company = await this.empresaRepo.findOneBy({ id });
    if (!company) {
      throw new NotFoundException();
    }
    this.empresaRepo.merge(company, changes);
    return this.empresaRepo.save(company);
  }

  async remove(id: number) {
    const company = await this.empresaRepo.findOne({ where: { id } });

    if (!company) {
      console.log('Empresa no encontrada');
      throw new NotFoundException('Empresa no encontrada');
    }

    await this.empresaRepo.update(id, { deletedAt: new Date() });

    const updatedCompany = await this.empresaRepo.findOne({ where: { id } });

    return {
      id: updatedCompany?.id,
      nombre: updatedCompany?.nombre,
      cuit: updatedCompany?.cuit,
      deletedAt: updatedCompany?.deletedAt,
      message: 'Empresa eliminada correctamente',
    };
  }

  async findOne(id: number) {
    const company = await this.empresaRepo.findOneBy({ id });
    if (!company) {
      throw new NotFoundException();
    }
    return company;
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
      const where: FindOptionsWhere<Empresa> = {};
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
      return false;
    }

    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    return true;
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

  #formatDate(fecha) {
    if (typeof fecha == 'object' && fecha != null) {
      const date = new Date(fecha as any).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return date.replaceAll('/', '-');
    } else {
      return fecha;
    }
  }

  async bulkCreate(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.worksheets[0];

    if (worksheet.rowCount > 255) {
      console.log(
        `❌ Número de filas excede el límite permitido: ${worksheet.rowCount}`,
      );
      throw new BadRequestException('El número máximo de filas es 255');
    }

    const headersData: string[] = [];
    const firstRow = worksheet.getRow(1);

    firstRow.eachCell({ includeEmpty: false }, (cell) => {
      headersData.push(cell.value.toString().toLowerCase().trim());
    });

    // Eliminar encabezado 'n°' si está presente en la primera columna
    if (headersData[0] === 'n°') {
      headersData.shift();
    }

    // Eliminar duplicados en los encabezados
    const uniqueHeaders = [...new Set(headersData)];

    const missingFields = expectedHeadersFile.filter(
      (field) => !uniqueHeaders.includes(field),
    );

    if (missingFields.length) {
      const errors = missingFields.map((field) => `Falta la columna ${field}`);
      throw new BadRequestException(errors);
    }

    // Validar el orden de columnas
    const isOrdered = this.#validateHedersOrder(
      expectedHeadersFile,
      uniqueHeaders,
    );
    if (!isOrdered) {
      throw new BadRequestException('Las columnas no están ordenadas');
    }

    const dataRows = worksheet.getRows(2, worksheet.rowCount);
    const promises = [];

    for (const row of dataRows) {
      const empresa = row.getCell(2).text?.trim();
      if (!empresa) continue;

      const data = {
        nombre: this.#formatText(empresa),
        cuit: this.#formatText(row.getCell(4).text),
        email: this.#formatText(row.getCell(5).text),
        telefono: this.#formatText(row.getCell(6).text),
        nombreContacto: this.#formatText(row.getCell(7).text),
        estado: row.getCell(8).text
          ? row.getCell(8).text.toUpperCase()
          : 'NO_ADHERIDO',
        seguimiento: this.#formatText(row.getCell(9).text),
        fechaAdhesion: this.#formatDate(row.getCell(10).value),
        declaracionJurada: this.#formatText(row.getCell(11).text),
        pvRegistro: this.#formatText(row.getCell(12).text),
        isActive: true,
        cargaMasiva: new Date(),
      };

      promises.push(this.updateOrCreate(data.nombre, data.cuit, data));
    }

    await Promise.all(promises);

    return {
      message: 'Carga completada con éxito',
      error: null,
      statusCode: HttpStatus.CREATED,
    };
  }
}
