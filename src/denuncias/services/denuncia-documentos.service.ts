import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { DenunciaDocumentos } from '../entities/denuncia-documento.entity';

@Injectable()
export class DenunciaDocumentosService {
  constructor(
    @InjectRepository(DenunciaDocumentos)
    private denunciaDocumentosRepo: Repository<DenunciaDocumentos>,
  ) {}

  async create(data) {
    const newDenounced = this.denunciaDocumentosRepo.create(data);

    await this.denunciaDocumentosRepo.save(newDenounced);
  }
}
