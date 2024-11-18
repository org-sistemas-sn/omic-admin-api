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
import { Denunciante } from './denunciante.entity';
import { DatosNotificacion } from './datos-notificacion.entity';

@Entity({ name: 'Direcciones_Enviadas' })
export class DireccionesEnviadas {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => DatosNotificacion, (e) => e.direccionesEnviadas)
  @JoinColumn({ name: 'Id_Datos_Notificacion' })
  datosNotificacion: DatosNotificacion;

  @ManyToOne(() => Denunciado, (e) => e.direccionesEnviadas)
  @JoinColumn({ name: 'Id_Denunciado' })
  denunciado: Denunciado;

  @ManyToOne(() => Denunciante, (e) => e.direccionesEnviadas)
  @JoinColumn({ name: 'Id_Denunciante' })
  denunciante: Denunciante;

  @Column({ type: 'varchar', length: 255, name: 'Email', nullable: true })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'Codigo_Postal',
    nullable: true,
  })
  codPostal: string;
}
