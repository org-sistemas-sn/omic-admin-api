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

@Entity({ name: 'Denunciante' })
export class Denunciante {
  @PrimaryGeneratedColumn({ name: 'Id_Denunciante' })
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'Nombre' })
  nombre: string;

  @Column({ type: 'varchar', length: 255, name: 'Apellido' })
  apellido: string;

  @Column({ type: 'bigint', name: 'DNI' })
  dni: string;

  @Column({ type: 'varchar', length: 255, name: 'Email' })
  email: string;

  @Column({ type: 'varchar', length: 90, name: 'Telefono', nullable: true })
  telefono: string;

  @Column({
    type: 'varchar',
    length: 90,
    nullable: true,
    name: 'Telefono_Alter',
  })
  telefonoAlter: string;

  @Column({ type: 'varchar', length: 90, name: 'Celular' })
  celular: string;

  @Column({ type: 'varchar', length: 255, name: 'Domicilio' })
  domicilio: string;

  @Column({ type: 'varchar', length: 90, name: 'Localidad' })
  localidad: string;

  @Column({ type: 'varchar', length: 45, name: 'Codigo_Postal' })
  codPostal: string;

  @OneToOne(() => Denuncia, (denuncia) => denuncia.denunciante)
  denuncia: Denuncia;
}
