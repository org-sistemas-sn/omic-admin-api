import {
  IsString,
  IsEnum,
  IsOptional,
  IsPositive,
  Min,
  ValidateIf,
  IsDateString,
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
  readonly denunciante: string;

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
  readonly estado: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  readonly limit: number;

  @ApiPropertyOptional()
  @ValidateIf((item) => item.limit)
  @Min(0)
  readonly offset: number;
}
