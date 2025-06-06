import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { FtpService } from '../ftp/ftp.service';
import { PinoLogger } from 'nestjs-pino';
import { Readable } from 'stream';

@Processor('ftp-tasks')
@Injectable()
export class FtpProcessor extends WorkerHost {
  constructor(
    private readonly ftpService: FtpService,
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { tipo, file } = job.data;

    this.logger.info(
      `📦 Procesando tarea FTP: ${tipo} - ${
        file?.fileName || file?.remotePath
      }`,
    );

    try {
      await this.ftpService.connect();

      switch (tipo) {
        case 'upload':
          const buffer = Buffer.from(file.content, 'base64');
          await this.ftpService.fileUpload(
            Readable.from(buffer),
            `${file.remotePath}/${file.fileName}`,
          );
          this.logger.info(`✅ Archivo subido: ${file.fileName}`);
          return;

        case 'create-dir':
          await this.ftpService.createDir(file.remotePath);
          this.logger.info(`📁 Carpeta creada: ${file.remotePath}`);
          return;

        case 'download':
          const downloadedFile = await this.ftpService.downloadFileAsBuffer(
            file.remotePath,
          );
          this.logger.info(`📥 Archivo descargado: ${file.remotePath}`);

          return downloadedFile.toString('base64');

        default:
          this.logger.warn(`❓ Tipo de tarea desconocido: ${tipo}`);
          return;
      }
    } catch (error) {
      this.logger.error(`❌ Error procesando tarea: ${error.message}`);
      throw error;
    } finally {
      this.ftpService.close();
    }
  }
}
