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
    console.log('Denuncia recibida:', denuncia);
    console.log('Denunciado recibido:', denunciado);
    const newDenounced = this.denunciadoDenunciaRepo.create({
      denuncia: denuncia,
      denunciado: denunciado,
    });
    // newDenounced.denuncia = complaint;
    return await this.denunciadoDenunciaRepo.save(newDenounced);
  }
}
