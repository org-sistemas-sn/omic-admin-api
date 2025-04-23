import { Injectable } from '@nestjs/common';
import { Params } from 'nestjs-pino';

@Injectable()
export class LoggerConfigService {
  createLoggerOptions(): Params {
    return {
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        autoLogging: {
          ignore: (req) => req.url === '/api/denuncias/aprobbed',
        },
      },
    };
  }
}
