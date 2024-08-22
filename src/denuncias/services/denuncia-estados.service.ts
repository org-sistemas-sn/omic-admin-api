import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { DenunciaEstados } from '../entities/denuncia-estado.entity';

@Injectable()
export class DenunciaEstadosService {
  constructor(
    @InjectRepository(DenunciaEstados)
    private denunciaEstadosRepo: Repository<DenunciaEstados>,
  ) {}

  async create(data) {
    const newDenounced = this.denunciaEstadosRepo.create(data);

    return await this.denunciaEstadosRepo.save(newDenounced);
  }
}
