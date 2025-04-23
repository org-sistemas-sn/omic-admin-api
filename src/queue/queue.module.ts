import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { FtpProcessor } from './ftp.processor';
import { DenunciaProcessor } from './denuncia.processor';
import { redisConnection } from './redis.config';
import { PinoLoggerModule } from '../logger/pino-logger.module';
import { FtpModule } from '../ftp/ftp.module';
import { DenunciasModule } from 'src/denuncias/denuncias.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnection,
    }),
    BullModule.registerQueue(
      {
        name: 'ftp-tasks',
        connection: redisConnection,
      },
      {
        name: 'denuncia-tasks',
        connection: redisConnection,
      },
    ),
    forwardRef(() => DenunciasModule),
    PinoLoggerModule,
    FtpModule,
  ],
  providers: [QueueService, FtpProcessor, DenunciaProcessor],
  exports: [QueueService],
})
export class QueueModule {}
