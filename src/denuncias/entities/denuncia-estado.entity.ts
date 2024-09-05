import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';
import { Denunciado } from './denunciado.entity';
import { Estado } from './estados.entity';
import { DatosNotificacion } from './datos-notificacion.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

@Entity({ name: 'Denuncia_Estados' })
export class DenunciaEstados {
  @PrimaryGeneratedColumn({ name: 'Id_Denuncia_Estados' })
  denunciaEstadosId: number;

  @Column({ type: 'int', name: 'Id_Denuncia' })
  denunciaId: number;

  @Column({ type: 'int', name: 'Id_Estado' })
  estadoId: number;

  @Column({ type: 'int', name: 'Id_Usuario' })
  usuarioId: number;

  @Column({ type: 'text' })
  motivo: string;

  @ManyToOne(() => Usuario, (d) => d.denunciaEstados)
  @JoinColumn({ name: 'Id_Usuario' })
  usuario: Usuario;

  @ManyToOne(() => Denuncia, (d) => d.denunciadoDenuncia)
  @JoinColumn({ name: 'Id_Denuncia' })
  denuncia: Denuncia;

  @ManyToOne(() => Estado, (d) => d.denuncias)
  @JoinColumn({ name: 'Id_Estado' })
  estado: Estado;

  @OneToOne(() => DatosNotificacion, (d) => d.denunciaEstado)
  datosNotificacion: DatosNotificacion;

  @CreateDateColumn({
    name: 'create_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createAt: Date;

  @UpdateDateColumn({
    name: 'update_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  updateAt: Date;
}
