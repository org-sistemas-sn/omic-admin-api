import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { DenunciadoDenuncia } from '../entities/denuncia-denunciado.entity';

@Injectable()
export class DenunciadoDenunciaService {
  constructor(
    @InjectRepository(DenunciadoDenuncia)
    private denunciadoDenunciaRepo: Repository<DenunciadoDenuncia>,
  ) {}

  async create({ denuncia, denunciado }) {
    const newDenounced = this.denunciadoDenunciaRepo.create({
      denuncia,
      denunciado,
    });
    // newDenounced.denuncia = complaint;
    return await this.denunciadoDenunciaRepo.save(newDenounced);
  }
}
