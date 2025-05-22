import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterExpedientesDto {
  @IsOptional()
  @IsString()
  nroExpediente?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  anio?: number;

  @IsOptional()
  @IsString()
  nombreDenunciante?: string;

  @IsOptional()
  @IsString()
  nombreDenunciado?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;
}
