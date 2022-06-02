import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { DatabaseModule } from './database/database.module';
import { enviroments } from './enviroments';
import { AuthModule } from './auth/auth.module';
import { EmpresasModule } from './empresas/empresas.module';
import { DenunciasModule } from './denuncias/denuncias.module';
import { FojasModule } from './fojas/fojas.module';
import config from './config';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
