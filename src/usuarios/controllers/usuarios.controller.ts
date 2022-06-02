import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UsuariosService } from '../services/usuarios.service';
import { CreateUserDto, UpdateUserDto } from '../dtos/usuario.dto';

@UseGuards(AuthGuard('jwt'))
@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Post()
  create(@Body() payload: CreateUserDto) {
    return this.usuariosService.create(payload);
  }

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateUserDto,
  ) {
    return this.usuariosService.update(id, payload);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }
}
