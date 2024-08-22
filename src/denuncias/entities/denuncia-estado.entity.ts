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
import { Estado } from './estados.entity';
import { DatosNotificacion } from './datos-notificacion.entity';

@Entity({ name: 'Denuncia_Estados' })
export class DenunciaEstados {
  @PrimaryGeneratedColumn({ name: 'Id_Denuncia_Estados' })
  denunciaEstadosId: number;

  @Column({ type: 'int', name: 'Id_Denuncia' })
  denunciaId: number;

  @Column({ type: 'int', name: 'Id_Estado' })
  estadoId: number;

  @Column({ type: 'text' })
  motivo: string;

  @ManyToOne(() => Denuncia, (d) => d.denunciadoDenuncia)
  @JoinColumn({ name: 'Id_Denuncia' })
  denuncia: Denuncia;

  @ManyToOne(() => Estado, (d) => d.denuncias)
  @JoinColumn({ name: 'Id_Estado' })
  estado: Estado;

  @OneToOne(() => DatosNotificacion, (d) => d.denunciaEstado)
  datosNotificacion: DatosNotificacion;
}
