import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsObject,
  IsNotEmptyObject,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateInformerDto } from './denunciante.dto';
import { CreateDenouncedDto } from './denunciado.dto';
import { CreateLicencedDto } from './autorizado.dto';

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  readonly descripcionHechos: string;

  @IsString()
  @IsNotEmpty()
  readonly pretension: string;

  @IsString()
  @IsNotEmpty()
  readonly maneraContrato: string;

  @IsString()
  @IsNotEmpty()
  readonly servicio: string;

  @IsString()
  @IsNotEmpty()
  readonly realizoReclamo: string;

  @IsString()
  @IsOptional()
  readonly observaciones: string;

  @IsString()
  @IsOptional()
  readonly estadoGeneral: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLicencedDto)
  readonly autorizado: CreateLicencedDto;

  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => CreateInformerDto)
  readonly denunciante: CreateInformerDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  @Type(() => CreateDenouncedDto)
  readonly denunciados: CreateDenouncedDto[];
}
