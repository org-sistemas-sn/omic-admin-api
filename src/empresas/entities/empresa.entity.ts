import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { Contacto } from './contacto.entity';

export enum empresaEstado {
  ADHERIDO = 'Adherido',
  NO_ADHERIDO = 'No_Adherido',
}

@Entity({ name: 'empresas' })
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cuit: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domicilio: string;

  @Column({
    type: 'enum',
    enum: empresaEstado,
    default: empresaEstado.ADHERIDO,
  })
  estado: string;

  @OneToMany(() => Contacto, (contacto) => contacto.empresa)
  contactos: Contacto[];

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
