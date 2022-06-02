import { Foja } from 'src/fojas/entities/foja.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';

import { Denunciado } from './denunciado.entity';
import { Denunciante } from './denunciante.entity';
import { Estado } from './estados.entity';

export enum estadoGeneral {
  abierto = 'ABIERTO',
  cerrado = 'CERRADO',
}

@Entity({ name: 'denuncias' })
export class Denuncia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', name: 'descripcion_hechos' })
  descripcionHechos: string;

  @Column({ type: 'text' })
  pretension: string;

  @Column({ type: 'varchar', length: 255, name: 'manera_contrato' })
  maneraContrato: string;

  @Column({ type: 'varchar', length: 255, name: 'servicio_denunciado' })
  servicio: string;

  @Column({ type: 'varchar', length: 255, name: 'realizo_reclamo' })
  realizoReclamo: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({
    type: 'enum',
    enum: estadoGeneral,
    default: estadoGeneral.abierto,
    name: 'estado_general',
  })
  estadoGeneral: string;

  @ManyToOne(() => Estado)
  @JoinColumn({ name: 'estado_id' })
  estado: Estado;

  @OneToOne(() => Denunciante)
  @JoinColumn({ name: 'denunciante_id' })
  denunciante: Denunciante;

  @OneToMany(() => Denunciado, (denunciado) => denunciado.denuncia)
  denunciados: Denunciado[];

  @OneToOne(() => Foja, (foja) => foja.denuncia)
  @JoinColumn({ name: 'foja_id' })
  foja: Foja;

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
