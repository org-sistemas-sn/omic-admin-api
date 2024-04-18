import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly nombre: string;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  readonly cuit: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly telefono: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly nombreContacto: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly estado: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly seguimiento: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly declaracionJurada: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly pvRegistro: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  readonly isActive: boolean;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
