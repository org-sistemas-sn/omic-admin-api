import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class FileService {
  async saveToTmp(file: Express.Multer.File): Promise<string> {
    const tmpDir = '/tmp';
    const ext = path.extname(file.originalname) || '';
    const filename = `${randomUUID()}${ext}`;
    const fullPath = path.join(tmpDir, filename);

    await fs.writeFile(fullPath, file.buffer);
    return fullPath;
  }

  async getBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async deleteTmp(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }
}
