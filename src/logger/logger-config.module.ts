import { Module } from '@nestjs/common';
import { LoggerConfigService } from './pino-logger.service';

@Module({
  providers: [LoggerConfigService],
  exports: [LoggerConfigService],
})
export class LoggerConfigModule {}
