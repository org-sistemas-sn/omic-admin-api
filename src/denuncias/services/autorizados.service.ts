import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Autorizado } from '../entities/autorizado.entity';
import { CreateLicencedDto } from '../dtos/autorizado.dto';

@Injectable()
export class AutorizadosService {
  constructor(
    @InjectRepository(Autorizado)
    private autorizadoRepo: Repository<Autorizado>,
  ) {}

  create(data: CreateLicencedDto) {
    const licenced = this.autorizadoRepo.create(data);
    return this.autorizadoRepo.save(licenced);
  }
}
