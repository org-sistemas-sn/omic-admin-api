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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateCompanyDto, UpdateCompanyDto } from '../dtos/empresa.dto';
import { CreateContactDto, UpdateContactDto } from '../dtos/contacto.dto';
import { EmpresasService } from '../services/empresas.service';
import { ContactosService } from '../services/contactos.service';
import { FilterCompanyDto } from '../dtos/filter.dto';

@ApiTags('Empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(
    private empresasService: EmpresasService,
    private contactosService: ContactosService,
  ) {}

  // Rutas Contactos

  @Post('contactos')
  createContact(@Body() payload: CreateContactDto) {
    return this.contactosService.create(payload);
  }

  @Put('contactos/:id')
  updateContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateContactDto,
  ) {
    return this.contactosService.update(id, payload);
  }

  @Delete('contactos/:id')
  deleteContact(@Param('id', ParseIntPipe) id: number) {
    return this.contactosService.remove(id);
  }

  // Rutas Empresas

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.findOneWithRelations(id, 'contactos');
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
}
