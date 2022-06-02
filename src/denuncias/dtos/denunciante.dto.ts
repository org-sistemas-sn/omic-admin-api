import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateInformerDto {
  @IsString()
  @IsNotEmpty()
  readonly nombre: string;

  @IsString()
  @IsNotEmpty()
  readonly apellido: string;

  @IsString()
  @IsNotEmpty()
  readonly dniCuil: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsOptional()
  readonly telefono: string;

  @IsString()
  @IsOptional()
  readonly telefonoAlter: string;

  @IsString()
  @IsNotEmpty()
  readonly celular: string;

  @IsString()
  @IsNotEmpty()
  readonly domicilio: string;

  @IsString()
  @IsNotEmpty()
  readonly localidad: string;

  @IsString()
  @IsNotEmpty()
  readonly codPostal: string;
}

export class UpdateInformerDto extends PartialType(CreateInformerDto) {}
