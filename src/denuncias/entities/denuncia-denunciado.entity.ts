import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';
import { Denunciado } from './denunciado.entity';
import { DatosNotificacion } from './datos-notificacion.entity';

@Entity({ name: 'Denunciado_Denuncia' })
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
