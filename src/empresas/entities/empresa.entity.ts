import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum empresaEstado {
  ADHERIDO = 'ADHERIDO',
  NO_ADHERIDO = 'NO_ADHERIDO',
}

@Entity({ name: 'empresas' })
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  cuit: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telefono: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'nombre_contacto',
  })
  nombreContacto: string;

  @Column({
    type: 'enum',
    enum: empresaEstado,
    default: empresaEstado.ADHERIDO,
  })
  estado: string;

  @Column({ type: 'text', nullable: true })
  seguimiento: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'fecha_adhesion',
  })
  fechaAdhesion: string;

  @Column({ type: 'text', nullable: true, name: 'declaracion_jurada' })
  declaracionJurada: string;

  @Column({ type: 'text', nullable: true, name: 'pv_registro' })
  pvRegistro: string;

  @Column({ type: 'bool', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', name: 'carga_masiva' })
  cargaMasiva: Date;

  @Column({ type: 'timestamp', name: 'deleted_at' })
  deletedAt: Date;
}
