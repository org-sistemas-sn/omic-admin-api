import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { CreateDenouncedDto } from '../dtos/denunciado.dto';
import { Denuncia } from '../entities/denuncia.entity';
import { Denunciado } from '../entities/denunciado.entity';

@Injectable()
export class DenunciadosService {
  constructor(
    @InjectRepository(Denunciado)
    private denunciadoRepo: Repository<Denunciado>,
  ) {}

  async createByArray(data: CreateDenouncedDto[], complaint: Denuncia) {
    for (const denounced of data) {
      const newDenounced = this.denunciadoRepo.create(denounced);
      // newDenounced.denuncia = complaint;
      await this.denunciadoRepo.save(newDenounced);
    }
  }

  async create(denounced: CreateDenouncedDto) {
    const newDenounced = this.denunciadoRepo.create(denounced);
    // newDenounced.denuncia = complaint;
    return await this.denunciadoRepo.save(newDenounced);
  }

  async findById(id: number) {
    const e = this.denunciadoRepo.findOne({
      where: {
        id,
      },
    });

    return e;
  }
}
