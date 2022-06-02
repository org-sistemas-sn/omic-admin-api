import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Denuncia } from './entities/denuncia.entity';
import { Denunciado } from './entities/denunciado.entity';
import { Denunciante } from './entities/denunciante.entity';
import { Estado } from './entities/estados.entity';
import { DenunciasService } from './services/denuncias.service';
import { DenunciasController } from './controllers/denuncias.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Denuncia, Denunciado, Denunciante, Estado]),
  ],
  providers: [DenunciasService],
  controllers: [DenunciasController],
})
export class DenunciasModule {}
