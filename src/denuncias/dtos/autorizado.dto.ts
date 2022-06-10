import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateLicencedDto {
  @IsString()
  @IsNotEmpty()
  readonly nombre: string;

  @IsString()
  @IsNotEmpty()
  readonly apellido: string;

  @IsString()
  @IsNotEmpty()
  readonly dni: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  readonly telefono: string;

  @IsString()
  @IsNotEmpty()
  readonly domicilio: string;

  @IsString()
  @IsNotEmpty()
  readonly localidad: string;
}
