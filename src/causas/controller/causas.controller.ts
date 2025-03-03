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

  @Get('/archivos')
  denunciaArchivos(@Param() param: any) {
    return this.causasService.archivos(param.id);
  }

  @Get('/documentos')
  denunciaDocumentos(@Param() param: any) {
    return this.causasService.documentos(param.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.causasService.findOne(id);
  }
}
