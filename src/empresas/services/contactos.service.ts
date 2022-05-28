import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contacto } from '../entities/contacto.entity';
import { CreateContact, UpdateContact } from '../dtos/contacto.dto';
import { EmpresasService } from '../services/empresas.service';

@Injectable()
export class ContactosService {
  constructor(
    @InjectRepository(Contacto) private contactosRepo: Repository<Contacto>,
    private empresasService: EmpresasService,
  ) {}

  async create(data: CreateContact) {
    const newContact = this.contactosRepo.create(data);
    if (!data.empresaId) {
      throw new BadRequestException();
    }
    const company = await this.empresasService.findOne(data.empresaId);
    newContact.empresa = company;
    return this.contactosRepo.save(newContact);
  }

  async update(id: number, changes: UpdateContact) {
    const contact = await this.contactosRepo.findOne(id, {
      relations: ['empresa'],
    });
    if (!contact) {
      throw new NotFoundException();
    }
    if (changes.empresaId) {
      const company = await this.empresasService.findOne(changes.empresaId);
      contact.empresa = company;
    }
    this.contactosRepo.merge(contact, changes);
    return this.contactosRepo.save(contact);
  }

  async remove(id: number) {
    const contact = await this.contactosRepo.findOne(id);
    if (!contact) {
      throw new NotFoundException();
    }
    return this.contactosRepo.remove(contact);
  }
}
