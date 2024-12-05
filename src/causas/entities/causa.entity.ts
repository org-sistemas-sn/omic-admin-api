import { Denuncia } from 'src/denuncias/entities/denuncia.entity';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'causa' })
export class Causa {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'nroCausa' })
  nroCausa: number;

  @PrimaryColumn({ type: 'integer', width: 6, name: 'anioCausa' })
  anioCausa: number;

  @OneToOne(() => Denuncia, (denuncia) => denuncia.causa)
  @JoinColumn({ name: 'denunciaId' })
  denuncia: Denuncia;

  @CreateDateColumn({
    name: 'createAt',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createAt: Date;
}
