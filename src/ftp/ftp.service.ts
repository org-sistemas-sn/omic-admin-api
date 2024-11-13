import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Client, UploadOptions, FTPResponse, AccessOptions } from 'basic-ftp';
import { Readable, Writable } from 'stream';

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

  async fileUpload(
    source: Readable | string,
    toRemotePath: string,
    options?: UploadOptions,
  ) {
    try {
      await this._ftpClient.access(this._options);
      console.log('Conexión exitosa - fileUpload');

      await this._ftpClient.uploadFrom(source, toRemotePath, options);

      return this._ftpClient.close();
    } catch (err) {
      this._ftpClient.close();
      throw err;
    }
  }

  async remove(toRemotePath: string) {
    try {
      await this._ftpClient.access(this._options);
      await this._ftpClient.remove(toRemotePath);

      return this._ftpClient.close();
    } catch (err) {
      this._ftpClient.close();
      throw err;
    }
  }

  async downloadFileAsBuffer(fromRemotePath) {
    try {
      await this._ftpClient.access(this._options);
      console.log('Conexión exitosa - downloadFileAsBuffer');

      // Crea un array para almacenar los datos en cada chunk
      const chunks = [];

      // Crea un Writable stream en memoria para capturar los datos
      const writableStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk); // Agrega cada chunk al array
          callback();
        },
      });

      // Descarga el archivo al Writable stream
      await this._ftpClient.downloadTo(writableStream, fromRemotePath);

      // Combina todos los chunks en un solo Buffer
      const buffer = Buffer.concat(chunks);

      // Ahora puedes utilizar el buffer o convertirlo en un blob si lo necesitas
      // Ejemplo de conversión a Blob en un entorno de navegador:
      // const blob = new Blob([buffer]);
      this._ftpClient.close();

      return buffer;
    } catch (err) {
      console.error('Error:', err);
      this._ftpClient.close();
    }
  }
}
