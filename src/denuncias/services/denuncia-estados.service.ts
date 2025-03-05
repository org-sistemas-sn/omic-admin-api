import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { DenunciaEstados } from '../entities/denuncia-estado.entity';
import { EstadosService } from './estados.service';

@Injectable()
export class DenunciaEstadosService {
  constructor(
    @InjectRepository(DenunciaEstados)
    private denunciaEstadosRepo: Repository<DenunciaEstados>,
    private estadosService: EstadosService,
  ) {}

  async create(data: {
    denunciaId: number;
    estadoId: number;
    usuarioId: number;
    motivo?: string;
  }) {
    const newDenounced = this.denunciaEstadosRepo.create(data);

    return await this.denunciaEstadosRepo.save(newDenounced);
  }

  async lastState({
    denunciaId,
    estadoId,
  }: {
    denunciaId: number;
    estadoId: number;
  }) {
    const relations = ['denuncia'];
    const result = await this.denunciaEstadosRepo.findOne({
      where: {
        denunciaId,
        estadoId,
      },
      order: {
        createAt: 'DESC',
      },
      relations,
    });

    return result;
  }

  async lastApproved() {
    const estado = await this.estadosService.findByKey('ESPERA_AUDIENCIA');

    const relations = ['denuncia'];
    const result = await this.denunciaEstadosRepo.findOne({
      where: {
        estadoId: estado.id,
      },
      order: {
        createAt: 'DESC',
      },
      relations,
    });

    return result;
  }
}
