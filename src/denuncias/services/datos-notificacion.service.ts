import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { DatosNotificacion } from '../entities/datos-notificacion.entity';
import { DenunciaEstados } from '../entities/denuncia-estado.entity';
import { Denuncia } from '../entities/denuncia.entity';

@Injectable()
export class DatosNotificacionService {
  constructor(
    @InjectRepository(DatosNotificacion)
    private datosNotificacionRepo: Repository<DatosNotificacion>,
  ) {}

  async update(
    id: number,
    {
      denunciaEstado,
      envio_tipo,
      meet_link,
      documentPath,
      id_usuario,
      comprobantes_notificacion,
    }: {
      denunciaEstado?: DenunciaEstados;
      envio_tipo?: string;
      meet_link?: string;
      documentPath?: string;
      id_usuario?: number;
      comprobantes_notificacion?: any[];
    },
  ) {
    const datosNotificacion = await this.datosNotificacionRepo.findOne({
      where: { id },
    });

    if (!datosNotificacion) {
      throw new Error('Datos de notificación no encontrados.');
    }

    datosNotificacion.denunciaEstado = denunciaEstado ? denunciaEstado : datosNotificacion.denunciaEstado;
    datosNotificacion.envio_tipo = envio_tipo ? envio_tipo : datosNotificacion.envio_tipo;
    datosNotificacion.meet_link = meet_link ? meet_link : datosNotificacion.meet_link;
    datosNotificacion.documentPath = documentPath ? documentPath : datosNotificacion.documentPath;
    datosNotificacion.id_usuario = id_usuario ? id_usuario : datosNotificacion.id_usuario;
    datosNotificacion.comprobantes_notificacion =
      comprobantes_notificacion ? comprobantes_notificacion : datosNotificacion.comprobantes_notificacion;

    return await this.datosNotificacionRepo.save(datosNotificacion);
  }

  async create({
    denuncia,
    denunciaEstado,
    envio_tipo,
    meet_link,
    documentPath,
    id_usuario,
    comprobantes_notificacion,
  }: {
    denuncia: Denuncia;
    denunciaEstado: DenunciaEstados;
    envio_tipo: string;
    meet_link: string;
    documentPath?: string;
    id_usuario?: number;
    comprobantes_notificacion?: any[];
  }) {
    const newDenounced = this.datosNotificacionRepo.create({
      denuncia,
      denunciaEstado,
      envio_tipo,
      meet_link,
      documentPath: documentPath || null,
      id_usuario,
      comprobantes_notificacion: comprobantes_notificacion || [],
    });

    return await this.datosNotificacionRepo.save(newDenounced);
  }

  async findById(id: number) {
    const e = this.datosNotificacionRepo.findOne({
      where: {
        id,
      },
    });

    return e;
  }

  async findByDenuncia(denunciaId: number) {
    const e = this.datosNotificacionRepo.findOne({
      where: {
        denuncia: { id: denunciaId },
      },
    });

    return e;
  }
}
