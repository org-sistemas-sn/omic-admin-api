import {
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
import { PaginatedExpedientesResponse } from '../dtos/expediente.dto';
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
