import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateDenouncedDto {
  @IsString()
  @IsNotEmpty()
  readonly nombre: string;

  @IsString()
  @IsOptional()
  readonly dniCuilCuit: string;

  @IsString()
  @IsOptional()
  readonly email: string;

  @IsString()
  @IsOptional()
  readonly telefono: string;

  @IsString()
  @IsOptional()
  readonly telefonoAlter: string;

  @IsString()
  @IsOptional()
  readonly domicilio: string;

  @IsString()
  @IsOptional()
  readonly localidad: string;

  @IsString()
  @IsOptional()
  readonly codPostal: string;
}

export class UpdateDenouncedDto extends PartialType(CreateDenouncedDto) {}
