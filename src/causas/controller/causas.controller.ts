/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Param,
  ParseIntPipe,
  Get,
  ValidationPipe,
  UsePipes,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CausasService } from '../services/causa.service';
import { FilterCauseDto } from 'src/denuncias/dtos/filter.dto';

@ApiTags('Causas')
@Controller('causas')
export class CausasController {
  constructor(private causasService: CausasService) {}

  @Get('')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  findCausas(@Query() params: FilterCauseDto) {
    return this.causasService.findCausas(params);
  }

  @Get('/cargar')
  createCauses() {
    return this.causasService.createCauses();
  }

  @Get('/archivos/:id')
  denunciaArchivos(@Param('id') id: number) {
    return this.causasService.archivos(id);
  }

  @Get('/documentos/:id')
  denunciaDocumentos(@Param('id') id: number) {
    return this.causasService.documentos(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.causasService.findOne(id);
  }
}
