import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Movimiento } from '../entities/movimiento.entity';
import { Denuncia } from 'src/denuncias/entities/denuncia.entity';

@Injectable()
export class MovimientoService {
  constructor(
    @InjectRepository(Movimiento)
    private movimientoRepo: Repository<Movimiento>,
  ) {}

  async create(data: {
    tabla_afectada: string;
    entidad_id: number;
    denuncia: Denuncia;
    tipo_cambio: 'CREATE' | 'UPDATE' | 'DELETE';
    descripcion: string;
    valor_nuevo: string;
    usuarioId?: number;
    createAt?: Date;
  }) {
    const e = this.movimientoRepo.create(data);

    return this.movimientoRepo.save(e);
  }

  async findOne({ denuncia }: { denuncia: Denuncia }) {
    return this.movimientoRepo.findOne({
      where: {
        denuncia,
      },
    });
  }
}
