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

  async markAsProcessed(
    denunciaId: number,
    estadoId: number,
    usuarioId: number,
  ): Promise<DenunciaEstados> {
    const updated = await this.denunciaEstadosRepo.update(
      {
        denunciaId,
        estadoId,
        processed_state: false,
      },
      {
        processed_state: true,
        processed_status_error: null,
        usuarioId,
      },
    );

    if (updated.affected === 0) {
      throw new Error(
        `No se encontró un estado pendiente para la denuncia ${denunciaId} y estado ${estadoId}`,
      );
    }

    return this.denunciaEstadosRepo.findOne({
      where: { denunciaId, estadoId, processed_state: true },
      order: { createAt: 'DESC' },
    });
  }

  async markAsFailed(
    denunciaId: number,
    estadoId: number,
    usuarioId: number,
    error: string,
  ): Promise<DenunciaEstados> {
    const updated = await this.denunciaEstadosRepo.update(
      {
        denunciaId,
        estadoId,
        processed_state: false,
      },
      {
        usuarioId,
        processed_status_error: error,
      },
    );

    if (updated.affected === 0) {
      throw new Error(
        `No se encontró un estado pendiente para la denuncia ${denunciaId} y estado ${estadoId}`,
      );
    }

    return this.denunciaEstadosRepo.findOne({
      where: { denunciaId, estadoId, processed_state: false },
      order: { createAt: 'DESC' },
    });
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
