import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, Repository, Like } from 'typeorm';

import { Empresa } from '../entities/empresa.entity';
import { CreateCompany, UpdateCompany } from '../dtos/empresa.dto';
import { FilterCompanyDTO } from '../dtos/filter.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa) private empresaRepo: Repository<Empresa>,
  ) {}

  async create(data: CreateCompany) {
    const company = await this.empresaRepo.findOne({
      where: { email: data.email },
    });
    if (company) throw new BadRequestException('Email in use');
    const newCompany = this.empresaRepo.create(data);
    return this.empresaRepo.save(newCompany);
  }

  async update(id: number, changes: UpdateCompany) {
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
    return this.empresaRepo.remove(company);
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

  findAll(params?: FilterCompanyDTO) {
    if (params) {
      const where: FindConditions<Empresa> = {};
      const { limit, offset } = params;
      const { nombre, cuit, email, domicilio, estado } = params;
      if (nombre) where.nombre = Like(`%${nombre}%`);
      if (cuit) where.cuit = Like(`%${cuit}%`);
      if (email) where.email = Like(email);
      if (domicilio) where.domicilio = Like(domicilio);
      if (estado) where.estado = Like(estado);
      if (!limit) {
        return this.empresaRepo.find({ relations: ['contactos'], where });
      }
      return this.empresaRepo.find({
        relations: ['contactos'],
        where,
        take: limit,
        skip: offset,
      });
    }
    return this.empresaRepo.find({ relations: ['contactos'] });
  }
}
