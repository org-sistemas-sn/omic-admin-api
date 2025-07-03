import { Module, Global } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import config from '../config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => {
        const { host, name, port, username, password, schema } =
          configService.database;
        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database: name,
          synchronize: false,
          autoLoadEntities: true,
          schema,
          ssl: {
            rejectUnauthorized: false,
          },
          logging: true,
          // logger: 'advanced-console',
          extra: {
            max: 20,
          },
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
