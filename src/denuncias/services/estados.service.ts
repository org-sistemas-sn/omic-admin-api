import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Estado } from '../entities/estados.entity';

@Injectable()
export class EstadosService {
  constructor(
    @InjectRepository(Estado) private estadoRepo: Repository<Estado>,
  ) {}

  async findOne(id: number) {
    const state = await this.estadoRepo.findOne(id);
    if (!state) {
      throw new NotFoundException();
    }
    return state;
  }
}
