import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Denunciante } from '../entities/denunciante.entity';
import { Repository } from 'typeorm';
import { CreateInformerDto } from '../dtos/denunciante.dto';
import { Autorizado } from '../entities/autorizado.entity';

@Injectable()
export class DenunciantesService {
  constructor(
    @InjectRepository(Denunciante)
    private denuncianteRepo: Repository<Denunciante>,
  ) {}

  create(data: CreateInformerDto, licended?: Autorizado) {
    const informer = this.denuncianteRepo.create(data);
    if (licended) {
      // informer.autorizado = licended;
    }
    return this.denuncianteRepo.save(informer);
  }
}
