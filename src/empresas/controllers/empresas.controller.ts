/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  ParseIntPipe,
  Delete,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateCompanyDto, UpdateCompanyDto } from '../dtos/empresa.dto';
import { EmpresasService } from '../services/empresas.service';
import { FilterCompanyDto } from '../dtos/filter.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(private empresasService: EmpresasService) {}

  // Rutas Empresas

  @Get('activas')
  findAllActives() {
    return this.empresasService.findActives();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.findOne(id);
  }

  @Get('')
  findAll(@Query() params: FilterCompanyDto) {
    return this.empresasService.findAll(params);
  }

  @Post('')
  create(@Body() payload: CreateCompanyDto) {
    return this.empresasService.create(payload);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCompanyDto,
  ) {
    return this.empresasService.update(id, payload);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.remove(id);
  }

  @Post('carga-masiva')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return this.empresasService.bulkCreate(file);
  }
}
