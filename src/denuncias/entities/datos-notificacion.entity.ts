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
import { DenunciadoDenuncia } from './denuncia-denunciado.entity';
import { DenunciaEstados } from './denuncia-estado.entity';

@Entity({ name: 'Datos_Notificacion' })
export class DatosNotificacion {
  @PrimaryGeneratedColumn({ name: 'id_datos_notificacion' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  envio_tipo: string;

  @Column({ type: 'varchar', length: 255 })
  denunciante_email: string;

  @Column({ type: 'varchar', length: 255 })
  denunciado_email: string;

  @Column({ type: 'varchar', length: 255 })
  meet_link: string;

  @Column({ type: 'varchar', length: 255 })
  direccion_postal: string;

  @OneToOne(() => DenunciaEstados, (d) => d.datosNotificacion)
  @JoinColumn({ name: 'id_denuncia_estado' })
  denunciaEstado: DenunciaEstados;
}
