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
    const state = await this.estadoRepo.findOneBy({ id });
    if (!state) {
      throw new NotFoundException();
    }
    return state;
  }

  async findAll() {
    const states = await this.estadoRepo.find({
      where: {
        show: true,
      },
    });
    if (!states) {
      throw new NotFoundException();
    }
    return states;
  }

  async findByKey(key) {
    const states = await this.estadoRepo.findOne({
      where: {
        key,
      },
    });
    if (!states) {
      throw new NotFoundException();
    }
    return states;
  }
}
