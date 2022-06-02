import {
  Controller,
  UseInterceptors,
  Post,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DenunciasService } from '../services/denuncias.service';

@Controller('denuncias')
export class DenunciasController {
  constructor(private denunciaService: DenunciasService) {}
  @Post('')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'poder' },
      { name: 'constancia' },
      { name: 'dni' },
      { name: 'factura' },
      { name: 'probatoria' },
    ]),
  )
  uploadFile(
    @UploadedFiles()
    files: {
      dni: Express.Multer.File[];
      factura: Express.Multer.File[];
      poder?: Express.Multer.File[];
      constancia?: Express.Multer.File[];
      probatoria?: Express.Multer.File[];
    },
    // @Body(
    //   new ParseFormDataJsonPipe('values'),
    //   new ValidationPipe({ whitelist: true }),
    // )
    // payload: CreateComplaint,
  ) {
    // console.log(payload);

    console.log(files);

    return 'ok';
  }
}
