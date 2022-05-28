import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompany {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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
  readonly domicilio: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly estado: string;
}

export class UpdateCompany extends PartialType(CreateCompany) {}
