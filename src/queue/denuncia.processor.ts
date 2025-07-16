import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DenunciasService } from 'src/denuncias/services/denuncias.service';

@Processor('denuncia-tasks')
@Injectable()
export class DenunciaProcessor extends WorkerHost {
  constructor(
    private readonly denunciasService: DenunciasService,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.info('✅ DenunciaProcessor inicializado');
  }

  async process(job: Job): Promise<void> {
    this.logger.info(`🔥 Job recibido: ${job.name}`);
    this.logger.info(`📄 Payload: ${JSON.stringify(job.data)}`);

    try {
      const tipo = job.name;

      switch (tipo) {
        case 'aprobar-denuncia':
          await this.denunciasService.aprobarDenuncia(job.data);
          break;

        case 'subir-documentos':
          await this.denunciasService.subirDocumentos(job.data);
          break;

        case 'notificar-por-correo':
          await this.denunciasService.notificarPorCorreo(job.data);
          break;

        case 'notificar-cambio-estado':
          await this.denunciasService.notificarCambioEstado(job.data);
          break;

        default:
          this.logger.warn(`⚠️ Tipo de job desconocido: ${tipo}`);
      }
    } catch (err) {
      this.logger.error(`❌ Error en job '${job.id}': ${err.message}`);
      throw err;
    }
  }
}
