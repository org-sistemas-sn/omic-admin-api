import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';
import { Denunciado } from './denunciado.entity';

@Entity({ name: 'denunciado_denuncia' })
export class DenunciadoDenuncia {
  @PrimaryGeneratedColumn({ name: 'Id_Denunciado_Denuncia' })
  denunciadoDenunciaId: number;

  @Column({ type: 'int', name: 'Id_Denunciado' })
  denunciadoId: number;

  @Column({ type: 'int', name: 'Id_Denuncia' })
  denunciaId: number;

  @ManyToOne(() => Denuncia, (denuncia) => denuncia.denunciadoDenuncia)
  @JoinColumn({ name: 'Id_Denuncia' })
  denuncia: Denuncia;

  @ManyToOne(() => Denunciado, (denunciado) => denunciado.denunciadoDenuncia)
  @JoinColumn({ name: 'Id_Denunciado' })
  denunciado: Denunciado;
}
