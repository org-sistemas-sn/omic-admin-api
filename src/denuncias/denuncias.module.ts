import { forwardRef, Module } from '@nestjs/common';
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
import { DenunciadoDenunciaService } from './services/denunciado-denuncia.service';
import { DireccionesEnviadas } from './entities/direcciones-enviadas.entity';
import { DireccionesEnviadasService } from './services/direcciones-enviadas.service';
import { MovimientoModule } from 'src/movimientos/movimientos.module';
import { CausasModule } from 'src/causas/causas.module';
import { CausasService } from 'src/causas/services/causa.service';
import { QueueModule } from 'src/queue/queue.module';

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
      DireccionesEnviadas,
    ]),
    FojasModule,
    DocumentosTipoModule,
    MovimientoModule,
    forwardRef(() => CausasModule),
    QueueModule,
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
    DenunciadoDenunciaService,
    DatosNotificacionService,
    DireccionesEnviadasService,
  ],
  controllers: [DenunciasController],
  exports: [DenunciasService],
})
export class DenunciasModule {}
