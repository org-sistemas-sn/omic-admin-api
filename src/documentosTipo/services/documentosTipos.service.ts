import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { DocumentosTipos } from '../entities/documentosTipos.entity';

@Injectable()
export class DocumentosTiposService {
  constructor(
    @InjectRepository(DocumentosTipos)
    private documentosTiposRepo: Repository<DocumentosTipos>,
  ) {}

  async create(data) {
    const newDenounced = this.documentosTiposRepo.create(data);

    await this.documentosTiposRepo.save(newDenounced);
  }

  async findByKey(key) {
    return this.documentosTiposRepo.findOne({
      where: {
        key,
      },
    });
  }
}
