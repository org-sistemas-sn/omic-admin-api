import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Denuncia } from './entities/denuncia.entity';
import { Denunciado } from './entities/denunciado.entity';
import { Denunciante } from './entities/denunciante.entity';
import { Estado } from './entities/estados.entity';
import { DenunciasService } from './services/denuncias.service';
import { DenunciasController } from './controllers/denuncias.controller';
import { Autorizado } from './entities/autorizado.entity';
import { DenunciantesService } from './services/denunciantes.service';
import { DenunciadosService } from './services/denunciados.service';
import { AutorizadosService } from './services/autorizados.service';
import { EstadosService } from './services/estados.service';
import { FojasModule } from 'src/fojas/fojas.module';
import { DenunciadoDenuncia } from './entities/denuncia-denunciado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Denuncia,
      Denunciado,
      Denunciante,
      DenunciadoDenuncia,
      Estado,
      Autorizado,
    ]),
    FojasModule,
  ],
  providers: [
    DenunciasService,
    DenunciantesService,
    DenunciadosService,
    AutorizadosService,
    EstadosService,
  ],
  controllers: [DenunciasController],
})
export class DenunciasModule {}
