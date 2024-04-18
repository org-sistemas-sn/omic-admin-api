import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// import { Denunciante } from './denunciante.entity';
import { Denuncia } from './denuncia.entity';

@Entity({ name: 'autorizado' })
export class Autorizado {
  @PrimaryGeneratedColumn({ name: 'Id_Autorizado' })
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'Nombre' })
  nombre: string;

  @Column({ type: 'varchar', length: 255, name: 'Apellido' })
  apellido: string;

  @Column({ type: 'varchar', length: 45, name: 'DNI' })
  dni: string;

  @Column({ type: 'varchar', length: 255, name: 'Email' })
  email: string;

  @Column({ type: 'varchar', length: 90, name: 'Telefono' })
  telefono: string;

  @Column({ type: 'varchar', length: 255, name: 'Domicilio' })
  domicilio: string;

  @Column({ type: 'varchar', length: 90, name: 'Localidad' })
  localidad: string;

  @OneToOne(() => Denuncia, (denuncia) => denuncia.autorizado)
  denuncia: Denuncia;
}
