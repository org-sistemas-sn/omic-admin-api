import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmpresasController } from './controllers/empresas.controller';
import { Empresa } from './entities/empresa.entity';
import { EmpresasService } from './services/empresas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa])],
  controllers: [EmpresasController],
  providers: [EmpresasService],
})
export class EmpresasModule {}
