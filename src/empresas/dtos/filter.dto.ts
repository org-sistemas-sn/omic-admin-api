import {
  IsString,
  IsEmail,
  IsOptional,
  IsPositive,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCompanyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly nombre: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly cuit: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  readonly email: string;

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
