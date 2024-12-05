import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoService } from './services/movimientos.service';
import { Movimiento } from './entities/movimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Movimiento])],
  providers: [MovimientoService],
  exports: [MovimientoService],
})
export class MovimientoModule {}
