import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';
import { DenunciaEstados } from './denuncia-estado.entity';
import { DireccionesEnviadas } from './direcciones-enviadas.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

@Entity({ name: 'Datos_Notificacion' })
export class DatosNotificacion {
  @PrimaryGeneratedColumn({ name: 'id_datos_notificacion' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  envio_tipo: string;

  @Column({ type: 'varchar', length: 255 })
  meet_link: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  documentPath: string;

  @OneToOne(() => DenunciaEstados, (d) => d.datosNotificacion)
  @JoinColumn({ name: 'id_denuncia_estado' })
  denunciaEstado: DenunciaEstados;

  @OneToMany(() => DireccionesEnviadas, (e) => e.datosNotificacion)
  direccionesEnviadas: DireccionesEnviadas[];

  @ManyToOne(() => Denuncia, (denuncia) => denuncia.archivos)
  @JoinColumn({ name: 'id_denuncia' })
  denuncia: Denuncia;

  @Column({ type: 'int', name: 'id_usuario' })
  id_usuario: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;
}
