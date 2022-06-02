import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Denuncia } from 'src/denuncias/entities/denuncia.entity';
import { Foja } from './entities/foja.entity';
import { Archivo } from './entities/archivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Denuncia, Foja, Archivo])],
})
export class FojasModule {}
