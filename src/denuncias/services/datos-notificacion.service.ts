import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { DatosNotificacion } from '../entities/datos-notificacion.entity';

@Injectable()
export class DatosNotificacionService {
  constructor(
    @InjectRepository(DatosNotificacion)
    private datosNotificacionRepo: Repository<DatosNotificacion>,
  ) {}

  async create(data) {
    const newDenounced = this.datosNotificacionRepo.create(data);

    return await this.datosNotificacionRepo.save(newDenounced);
  }
}
