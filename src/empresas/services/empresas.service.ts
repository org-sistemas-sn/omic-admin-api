import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Empresa } from '../entities/empresa.entity';
import { CreateCompany, UpdateCompany } from '../dtos/empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa) private empresaRepo: Repository<Empresa>,
  ) {}

  create(data: CreateCompany) {
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
}
