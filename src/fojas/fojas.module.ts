import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Denuncia } from 'src/denuncias/entities/denuncia.entity';
import { Foja } from './entities/foja.entity';
import { Archivo } from './entities/archivo.entity';
import { FtpService } from '../ftp/ftp.service';
import { ArchivosService } from './services/archivos.service';
import { FojasService } from './services/fojas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Denuncia, Foja, Archivo])],
  providers: [ArchivosService, FtpService, FojasService],
  exports: [ArchivosService, FojasService],
})
export class FojasModule {}
