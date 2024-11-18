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

  async create({
    denuncia,
    denunciaEstado,
    envio_tipo,
    meet_link,
  }: {
    denuncia: Denuncia;
    denunciaEstado: DenunciaEstados;
    envio_tipo: string;
    meet_link: string;
  }) {
    const newDenounced = this.datosNotificacionRepo.create({
      denuncia,
      denunciaEstado,
      envio_tipo,
      meet_link,
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
}
