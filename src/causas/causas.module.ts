import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Causa } from './entities/causa.entity';
import { CausasService } from './services/causa.service';
import { DenunciasModule } from 'src/denuncias/denuncias.module';
import { CausasController } from './controller/causas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Causa]),
    forwardRef(() => DenunciasModule),
  ],
  providers: [CausasService],
  exports: [CausasService],
  controllers: [CausasController],
})
export class CausasModule {}
