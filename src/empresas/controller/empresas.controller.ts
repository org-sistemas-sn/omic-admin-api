import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  ParseIntPipe,
  Delete,
  Get,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateCompany, UpdateCompany } from '../dtos/empresa.dto';
import { CreateContact, UpdateContact } from '../dtos/contacto.dto';
import { EmpresasService } from '../services/empresas.service';
import { ContactosService } from '../services/contactos.service';

@ApiTags('Empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(
    private empresasService: EmpresasService,
    private contactosService: ContactosService,
  ) {}

  // Rutas Contactos

  @Post('contactos')
  createContact(@Body() payload: CreateContact) {
    return this.contactosService.create(payload);
  }

  @Put('contactos/:id')
  updateContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateContact,
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

  @Post('')
  create(@Body() payload: CreateCompany) {
    return this.empresasService.create(payload);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCompany,
  ) {
    return this.empresasService.update(id, payload);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.empresasService.remove(id);
  }
}
