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
  Put,
  ParseIntPipe,
  UploadedFile,
  HttpCode,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';

import { ParseFormDataJsonPipe } from 'src/common/parse-formdata-json.pipe';
import { CreateComplaintDto } from '../dtos/denuncia.dto';
import { DenunciasService } from '../services/denuncias.service';
import { FojasService } from '../../fojas/services/fojas.service';
import { ArchivosService } from '../../fojas/services/archivos.service';
import { FilterComplaintDto } from '../dtos/filter.dto';
import { EstadosService } from '../services/estados.service';
import { DenunciaEstadosService } from '../services/denuncia-estados.service';

@ApiTags('Denuncias')
@Controller('denuncias')
export class DenunciasController {
  constructor(
    private denunciaService: DenunciasService,
    private fojasService: FojasService,
    private archivosService: ArchivosService,
    private estadosService: EstadosService,
    private denunciaEstadosService: DenunciaEstadosService,
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
  findDenuncias(@Query() params: FilterComplaintDto) {
    return this.denunciaService.findDenuncias(params);
  }

  @Get('/states')
  findStates() {
    return this.estadosService.findAll();
  }

  @Get('/last-approved')
  lastApproved() {
    return this.denunciaEstadosService.lastApproved();
  }

  @Get('/archivos/:id')
  denunciaArchivos(@Param('id') id: number) {
    return this.denunciaService.denunciaArchivos(id);
  }

  @Get('/documentos/:id')
  denunciaDocumentos(@Param('id') id: number) {
    return this.denunciaService.denunciaDocumentos(id);
  }

  @Get('/cargar-movimientos')
  cargarMovimientos() {
    return this.denunciaService.cargarMovimientos();
  }

  @Get(':id')
  findOne(@Param() param: any) {
    return this.denunciaService.findOne(param.id);
  }

  @Put('/change-state')
  @UseInterceptors(FileInterceptor('file'))
  changeState(
    @UploadedFile()
    file,
    @Body()
    payload: any,
  ) {
    return this.denunciaService.changeState(payload, file);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() payload) {
    return this.denunciaService.update(id, payload);
  }

  @Get('/download-docx/:id')
  downloadDocx(@Param() param: any) {
    return this.denunciaService.downloadDocx(param.id);
  }

  @Post('/aprobbed')
  create(@Body() payload: any) {
    return this.denunciaService.procesarDenunciaCompleta(payload);
  }

  @Post('/reject')
  reject(@Body() payload: any) {
    return this.denunciaService.reject(payload);
  }

  @Post('/revert')
  revert(@Body() payload: any) {
    return this.denunciaService.revert(payload);
  }

  @Post('/send-emails')
  sendDenunciandosMails(@Body() payload: any) {
    return this.denunciaService.sendDenunciandosMails(payload);
  }

  @Post('/add-denounced')
  addDenunciado(@Body() payload: any) {
    return this.denunciaService.addDenunciado(payload);
  }

  @Post('/upload-document')
  @UseInterceptors(FileInterceptor('file'))
  adjuntarDocumentacion(
    @UploadedFile()
    file,
    @Body()
    payload: any,
  ) {
    return this.denunciaService.adjuntarDocumentacion(payload, file);
  }
}
