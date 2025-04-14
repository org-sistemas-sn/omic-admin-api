import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { FtpProcessor } from './ftp.processor';
import { redisConnection } from './redis.config';
import { PinoLoggerModule } from '../logger/pino-logger.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConnection,
    }),
    BullModule.registerQueue({
      name: 'ftp-tasks',
    }),
    PinoLoggerModule,
  ],
  providers: [QueueService, FtpProcessor],
  exports: [QueueService],
})
export class QueueModule {}
