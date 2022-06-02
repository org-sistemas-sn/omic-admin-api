import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { Autorizado } from './autorizado.entity';
import { Denuncia } from './denuncia.entity';

@Entity({ name: 'denunciantes' })
export class Denunciante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  apellido: string;

  @Column({ type: 'varchar', length: 255, name: 'dni_cuil' })
  dniCuil: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telefono: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'telefono_alter',
  })
  telefonoAlter: string;

  @Column({ type: 'varchar', length: 255 })
  celular: string;

  @Column({ type: 'varchar', length: 255 })
  domicilio: string;

  @Column({ type: 'varchar', length: 255 })
  localidad: string;

  @Column({ type: 'varchar', length: 255, name: 'cod_postal' })
  codPostal: string;

  @OneToOne(() => Autorizado, (autorizado) => autorizado.denunciante)
  @JoinColumn({ name: 'autorizado_id' })
  autorizado: Autorizado;

  @OneToOne(() => Denuncia, (denuncia) => denuncia.denunciante)
  denuncia: Denuncia;

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
