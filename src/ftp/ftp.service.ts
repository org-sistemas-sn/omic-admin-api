import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Client, UploadOptions, FTPResponse, AccessOptions } from 'basic-ftp';
import { Readable } from 'stream';

import config from 'src/config';

@Injectable()
export class FtpService {
  private readonly _ftpClient: Client;
  private _options: AccessOptions;
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {
    this._ftpClient = new Client();
    this._options = {
      host: configService.ftp.host,
      user: configService.ftp.user,
      password: configService.ftp.password,
    };
  }

  async connect() {
    try {
      await this._ftpClient.access(this._options);
    } catch (error) {
      throw error;
    }
  }

  async upload(
    source: Readable | string,
    toRemotePath: string,
    options?: UploadOptions,
  ): Promise<FTPResponse> {
    try {
      return await this._ftpClient.uploadFrom(source, toRemotePath, options);
    } catch (err) {
      this._ftpClient.close();
      throw err;
    }
  }

  close(): void {
    this._ftpClient.close();
  }

  async createDir(dir: string) {
    try {
      await this._ftpClient.ensureDir(dir);
    } catch (err) {
      this._ftpClient.close();
      throw err;
    }
  }
}
