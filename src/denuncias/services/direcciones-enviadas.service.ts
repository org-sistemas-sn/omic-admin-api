import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DireccionesEnviadas } from '../entities/direcciones-enviadas.entity';
import { DatosNotificacionService } from './datos-notificacion.service';
import { DenunciantesService } from './denunciantes.service';
import { DenunciadosService } from './denunciados.service';

@Injectable()
export class DireccionesEnviadasService {
  constructor(
    @InjectRepository(DireccionesEnviadas)
    private direccionesEnviadasRepo: Repository<DireccionesEnviadas>,
    private datosNotificacionService: DatosNotificacionService,
    private denunciantesService: DenunciantesService,
    private denunciadosService: DenunciadosService,
  ) {}

  async create({
    datosNotificacionId,
    denunciadoId,
    denuncianteId,
    codPostal,
    email,
  }: {
    datosNotificacionId: number;
    denunciadoId?: number;
    denuncianteId?: number;
    codPostal?: string;
    email?: string;
  }) {
    const datosNotificacion = await this.datosNotificacionService.findById(
      datosNotificacionId,
    );
    let denunciado = null;
    let denunciante = null;

    if (denuncianteId) {
      denunciante = await this.denunciantesService.findById(denunciadoId);
    }

    if (denunciadoId) {
      denunciado = await this.denunciadosService.findById(denunciadoId);
    }

    const e = this.direccionesEnviadasRepo.create({
      datosNotificacion,
      denunciado,
      denunciante,
      codPostal,
      email,
    });

    return this.direccionesEnviadasRepo.save(e);
  }
}
