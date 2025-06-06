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

  async create(data: {
    denunciaId: number;
    documentoTipoId: number;
    fileName: string;
    path: string;
    documentName?: string;
  }) {
    console.log('Datos antes de crear DenunciaDocumentos:', data);

    const newDenounced = this.denunciaDocumentosRepo.create(data);

    return await this.denunciaDocumentosRepo.save(newDenounced);
  }

  async delete(denunciaDocumento: DenunciaDocumentos) {
    console.log(
      'Datos antes de eliminar DenunciaDocumentos:',
      denunciaDocumento.denunciaDocumentosId,
    );
    return this.denunciaDocumentosRepo.delete({
      denunciaDocumentosId: denunciaDocumento.denunciaDocumentosId,
    });
  }
}
