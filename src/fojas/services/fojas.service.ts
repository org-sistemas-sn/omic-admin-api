import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Foja } from '../entities/foja.entity';
import { NotFoundException } from '@nestjs/common';
import { Denuncia } from '../../denuncias/entities/denuncia.entity';

@Injectable()
export class FojasService {
  private _dir = '/images/omic-admin/fojas/nro-exp-';
  constructor(@InjectRepository(Foja) private fojaRepo: Repository<Foja>) {}

  async create(complaint: Denuncia) {
    const dir = this._dir + complaint.id;
    const foja = new Foja();
    foja.ruta = dir;
    // foja.denuncia = complaint;
    return this.fojaRepo.save(foja);
  }

  async findOne(id: number) {
    const foja = await this.fojaRepo.findOne(id);
    if (!foja) {
      throw new NotFoundException();
    }
    return foja;
  }
}
