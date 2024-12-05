import { Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CauseDto {
  @ApiPropertyOptional()
  @ValidateIf((item) => item.limit)
  @Min(0)
  readonly nroCausa: number;

  @ApiPropertyOptional()
  @ValidateIf((item) => item.limit)
  @Min(0)
  readonly anio: number;

  @ApiPropertyOptional()
  @ValidateIf((item) => item.limit)
  @Min(0)
  readonly denunciaId: number;
}
