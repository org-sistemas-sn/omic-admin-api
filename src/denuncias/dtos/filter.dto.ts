import {
  IsString,
  IsEnum,
  IsOptional,
  IsPositive,
  Min,
  ValidateIf,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { estadoGeneral } from '../entities/denuncia.entity';

export class FilterComplaintDto {
  @ApiPropertyOptional({
    description: 'enum for general status',
    enum: estadoGeneral,
  })
  @IsEnum(estadoGeneral)
  @IsOptional()
  readonly estadoGeneral: estadoGeneral;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly nombre: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly apellido: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  readonly fechaInicio: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly dni: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly email: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  readonly estado: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  readonly limit: number;

  @ApiPropertyOptional()
  @ValidateIf((item) => item.limit)
  @Min(0)
  readonly offset: number;

  @ApiPropertyOptional()
  @IsOptional()
  readonly orden: any;
}
