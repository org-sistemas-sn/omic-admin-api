import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

@Processor('ftp-tasks')
export class FtpProcessor extends WorkerHost {
  constructor(private readonly logger: PinoLogger) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { tipo, archivo } = job.data;

    this.logger.info(`🚧 Procesando tarea FTP: ${tipo} - ${archivo}`);

    try {
      this.logger.debug(`📂 Ejecutando operación para archivo: ${archivo}`);

      this.logger.info(`✅ Completado: ${archivo}`);
    } catch (error) {
      this.logger.error(`❌ Error procesando ${archivo}: ${error.message}`);
      throw error;
    }
  }
}
