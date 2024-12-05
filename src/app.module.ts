import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import config from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { DatabaseModule } from './database/database.module';
import { enviroments } from './enviroments';
import { AuthModule } from './auth/auth.module';
import { EmpresasModule } from './empresas/empresas.module';
import { DenunciasModule } from './denuncias/denuncias.module';
import { FojasModule } from './fojas/fojas.module';
import { DocumentosTipoModule } from './documentosTipo/documentosTipos.module';
import { MovimientoModule } from './movimientos/movimientos.module';
import { CausasModule } from './causas/causas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: enviroments[process.env.NODE_ENV] || '.env',
      load: [config],
      isGlobal: true,
    }),
    UsuariosModule,
    DatabaseModule,
    AuthModule,
    EmpresasModule,
    DenunciasModule,
    FojasModule,
    DocumentosTipoModule,
    MovimientoModule,
    CausasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
