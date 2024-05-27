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
import { DenunciadoDenuncia } from './denuncia-denunciado.entity';
import { Autorizado } from './autorizado.entity';
import { Archivo } from './archivo.entity';

export enum estadoGeneral {
  abierto = 'ABIERTO',
  cerrado = 'CERRADO',
}

@Entity({ name: 'Denuncia' })
export class Denuncia {
  @PrimaryGeneratedColumn({ name: 'Id_Denuncia' })
  id: number;

  @Column({ type: 'text', name: 'Descripcion_Hechos' })
  descripcionHechos: string;

  @Column({ type: 'text', name: 'Pretension' })
  pretension: string;

  @Column({ type: 'varchar', length: 90, name: 'Manera_Contrato' })
  maneraContrato: string;

  @Column({ type: 'varchar', length: 90, name: 'Metodo_Pago' })
  metodoPago: string;

  @Column({ type: 'varchar', length: 90, name: 'Servicio_Denunciado' })
  servicio: string;

  @Column({ type: 'varchar', length: 45, name: 'Realizo_Reclamo' })
  realizoReclamo: string;

  @Column({ type: 'text', name: 'Observaciones', nullable: true })
  observaciones: string;

  @Column({ type: 'date', name: 'Fecha' })
  fecha: Date;

  // @Column({
  //   type: 'enum',
  //   enum: estadoGeneral,
  //   default: estadoGeneral.abierto,
  //   name: 'estado_general',
  // })
  // estadoGeneral: string;

  // @ManyToOne(() => Estado)
  // @JoinColumn({ name: 'estado_id' })
  // estado: Estado;

  @OneToOne(() => Denunciante)
  @JoinColumn({ name: 'Id_Denunciante' })
  denunciante: Denunciante;

  @OneToOne(() => Autorizado, (autorizado) => autorizado.denuncia)
  @JoinColumn({ name: 'Id_Autorizado' })
  autorizado: Autorizado;

  @OneToMany(
    () => DenunciadoDenuncia,
    (denunciadoDenuncia) => denunciadoDenuncia.denuncia,
  )
  denunciadoDenuncia: DenunciadoDenuncia[];

  @OneToMany(() => Archivo, (archivo) => archivo.denuncia)
  archivos: Archivo[];

  // @OneToOne(() => Foja, (foja) => foja.denuncia)
  // foja: Foja;
}
