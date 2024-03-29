import {
  Controller,
  UseInterceptors,
  Post,
  UploadedFiles,
  ValidationPipe,
  Body,
  Get,
  Query,
  UsePipes,
  Param,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';

import { ParseFormDataJsonPipe } from 'src/common/parse-formdata-json.pipe';
import { CreateComplaintDto } from '../dtos/denuncia.dto';
import { DenunciasService } from '../services/denuncias.service';
import { FojasService } from '../../fojas/services/fojas.service';
import { ArchivosService } from '../../fojas/services/archivos.service';
import { FilterComplaintDto } from '../dtos/filter.dto';

@ApiTags('Denuncias')
@Controller('denuncias')
export class DenunciasController {
  constructor(
    private denunciaService: DenunciasService,
    private fojasService: FojasService,
    private archivosService: ArchivosService,
  ) {}
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
  async createComplaint(
    @UploadedFiles()
    files: {
      dni: Express.Multer.File[];
      factura: Express.Multer.File[];
      poder?: Express.Multer.File[];
      constancia?: Express.Multer.File[];
      probatoria?: Express.Multer.File[];
    },
    @Body(
      new ParseFormDataJsonPipe('values'),
      new ValidationPipe({ whitelist: true, transform: true }),
    )
    payload: CreateComplaintDto,
  ) {
    console.log(payload);
    const complaint = await this.denunciaService.create(payload);
    const foja = await this.fojasService.create(complaint);

    await this.archivosService.createByArray(files.dni, 'DNI', foja.id);
    await this.archivosService.createByArray(files.factura, 'FACTURA', foja.id);

    if (files.poder) {
      await this.archivosService.createByArray(files.poder, 'PODER', foja.id);
    }

    if (files.constancia) {
      await this.archivosService.createByArray(
        files.constancia,
        'CONSTANCIA',
        foja.id,
      );
    }

    if (files.probatoria) {
      await this.archivosService.createByArray(
        files.probatoria,
        'PROBATORIA',
        foja.id,
      );
    }

    return 'CREATED';
  }

  @Get('')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  findAll(@Query() params: FilterComplaintDto) {
    return this.denunciaService.findAll(params);
  }

  @Get(':id')
  findOne(@Param() param: any) {
    return this.denunciaService.findOne(param.id);
  }
}
