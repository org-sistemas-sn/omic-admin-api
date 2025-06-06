import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ExpedientesService } from '../services/expedientes.service';
import {
  PaginatedExpedientesResponse,
  PaginatedCausasNoDigitalizadasResponse,
} from '../dtos/expediente.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateEstadoDto } from '../dtos/update-estado.dto';
import { FilterExpedientesDto } from '../dtos/filter-expedientes.dto';

@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly expedientesService: ExpedientesService) {}

  @Get()
  async getAll(
    @Query() filters: FilterExpedientesDto,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<PaginatedExpedientesResponse> {
    return this.expedientesService.getExpedientes(
      Number(page),
      Number(limit),
      filters,
    );
  }

  @Get('/no-digitalizados')
  async getNoDigitalizados(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<PaginatedCausasNoDigitalizadasResponse> {
    return this.expedientesService.getNoDigitalizados(
      Number(page),
      Number(limit),
    );
  }

  @Post('carga-masiva')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (
      file.mimetype !==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      !file.originalname.toLowerCase().endsWith('.xlsx')
    ) {
      throw new BadRequestException('Debe subir un archivo Excel (.xlsx)');
    }
    console.log('Archivo recibido:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return this.expedientesService.importarDesdeExcel(file.buffer);
  }

  @Put(':id/estado')
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.expedientesService.actualizarEstado(id, dto.estado);
  }
}
