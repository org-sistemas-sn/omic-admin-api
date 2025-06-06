import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { LoggerConfigService } from './pino-logger.service';
import { LoggerConfigModule } from './logger-config.module';

@Module({
  imports: [
    LoggerConfigModule,
    LoggerModule.forRootAsync({
      imports: [LoggerConfigModule],
      inject: [LoggerConfigService],
      useFactory: (config: LoggerConfigService) => config.createLoggerOptions(),
    }),
  ],
  exports: [LoggerModule],
})
export class PinoLoggerModule {}
