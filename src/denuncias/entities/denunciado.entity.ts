import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Empresa } from 'src/empresas/entities/empresa.entity';
import { Denuncia } from './denuncia.entity';

@Entity({ name: 'denunciados' })
export class Denunciado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'dni_cuil_cuit',
    nullable: true,
  })
  dniCuilCuit: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
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

  @Column({ type: 'varchar', length: 255, nullable: true })
  domicilio: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  localidad: string;

  @Column({ type: 'varchar', length: 255, name: 'cod_postal', nullable: true })
  codPostal: string;

  @ManyToOne(() => Denuncia, (denuncia) => denuncia.denunciados)
  @JoinColumn({ name: 'denuncia_id' })
  denuncia: Denuncia;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

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
