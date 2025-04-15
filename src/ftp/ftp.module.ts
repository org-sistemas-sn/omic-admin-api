// src/ftp/ftp.module.ts
import { Module } from '@nestjs/common';
import { FtpService } from './ftp.service';

@Module({
  providers: [FtpService],
  exports: [FtpService],
})
export class FtpModule {}
