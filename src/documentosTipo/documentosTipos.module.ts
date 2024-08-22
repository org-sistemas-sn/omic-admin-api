import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentosTipos } from './entities/documentosTipos.entity';
import { DocumentosTiposService } from './services/documentosTipos.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentosTipos])],
  providers: [DocumentosTiposService],
  controllers: [],
  exports: [DocumentosTiposService],
})
export class DocumentosTipoModule {}
