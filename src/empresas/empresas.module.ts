import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmpresasController } from './controllers/empresas.controller';
import { Empresa } from './entities/empresa.entity';
import { EmpresasService } from './services/empresas.service';
import { Contacto } from './entities/contacto.entity';
import { ContactosService } from './services/contactos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, Contacto])],
  controllers: [EmpresasController],
  providers: [EmpresasService, ContactosService],
})
export class EmpresasModule {}
