import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Readable } from 'stream';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FtpService } from '../../ftp/ftp.service';
import { FojasService } from './fojas.service';
import { Archivo } from '../entities/archivo.entity';

@Injectable()
export class ArchivosService {
  constructor(
    private ftpService: FtpService,
    private fojasService: FojasService,
    @InjectRepository(Archivo) private archivoRepo: Repository<Archivo>,
  ) {}

  async createByArray(
    files: Express.Multer.File[],
    desc: string,
    fojaId: number,
  ) {
    const foja = await this.fojasService.findOne(fojaId);
    await this.ftpService.connect();
    await this.ftpService.createDir(foja.ruta);
    for (const file of files) {
      const stream = Readable.from(file.buffer);
      const remotePath = foja.ruta + `/${file.originalname}`;
      try {
        await this.ftpService.upload(stream, remotePath);
        const newFile = new Archivo();
        newFile.nombre = file.originalname;
        newFile.descripcion = desc;
        newFile.foja = foja;
        await this.archivoRepo.save(newFile);
      } catch (error) {
        console.log(error);
        throw new InternalServerErrorException();
      }
    }
    this.ftpService.close();
  }
}
