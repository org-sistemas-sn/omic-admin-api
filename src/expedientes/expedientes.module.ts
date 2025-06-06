// expedientes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpedientesController } from './controllers/expedientes.controller';
import { ExpedientesService } from './services/expedientes.service';
import { Causa } from 'src/causas/entities/causa.entity';
import { CausaNoDigitalizada } from 'src/causas/entities/causaNoDigitalizada.entity';
import { DenunciadoNoDigitalizado } from 'src/causas/entities/denunciadoNoDigitalizado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Causa,
      CausaNoDigitalizada,
      DenunciadoNoDigitalizado,
    ]),
  ],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
})
export class ExpedientesModule {}
