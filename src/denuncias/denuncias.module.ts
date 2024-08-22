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
import { Archivo } from './entities/archivo.entity';
import { DenunciaEstados } from './entities/denuncia-estado.entity';
import { DenunciaDocumentos } from './entities/denuncia-documento.entity';
import { DatosNotificacion } from './entities/datos-notificacion.entity';
import { DenunciaEstadosService } from './services/denuncia-estados.service';
import { FtpService } from '../ftp/ftp.service';
import { TemplateService } from 'src/template/template.service';
import { DatosNotificacionService } from './services/datos-notificacion.service';
import { DocumentosTipoModule } from 'src/documentosTipo/documentosTipos.module';
import { DenunciaDocumentosService } from './services/denuncia-documentos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Denuncia,
      Denunciado,
      Denunciante,
      DenunciadoDenuncia,
      Estado,
      Autorizado,
      Archivo,
      DenunciaEstados,
      DenunciaDocumentos,
      DatosNotificacion,
    ]),
    FojasModule,
    DocumentosTipoModule,
  ],
  providers: [
    DenunciasService,
    DenunciantesService,
    DenunciadosService,
    AutorizadosService,
    EstadosService,
    DenunciaEstadosService,
    FtpService,
    TemplateService,
    DatosNotificacionService,
    DenunciaDocumentosService,
  ],
  controllers: [DenunciasController],
})
export class DenunciasModule {}
