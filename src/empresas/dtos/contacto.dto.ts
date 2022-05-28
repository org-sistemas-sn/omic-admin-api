import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsPositive,
  IsNumber,
} from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContact {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly nombre: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly caracter: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly telefono: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly domicilioReal: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly domicilioConstituido: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  readonly empresaId: number;
}

export class UpdateContact extends PartialType(CreateContact) {}
