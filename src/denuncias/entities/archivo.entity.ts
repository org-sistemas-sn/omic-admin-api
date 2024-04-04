import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';

@Entity({ name: 'archivo' })
export class Archivo {
  @PrimaryGeneratedColumn({ name: 'Id_Archivo' })
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'Descripcion' })
  descripcion: string;

  @Column({ type: 'int', name: 'Poder' })
  poder: number;

  @Column({ type: 'int', name: 'Constancia' })
  constancia: number;

  @Column({ type: 'int', name: 'DNI' })
  dni: number;

  @Column({ type: 'int', name: 'Factura' })
  factura: number;

  @Column({ type: 'int', name: 'Probatoria' })
  probatoria: number;

  @ManyToOne(() => Denuncia, (denuncia) => denuncia.archivos)
  @JoinColumn({ name: 'Id_Denuncia' })
  denuncia: Denuncia;

  //   @CreateDateColumn({
  //     name: 'create_at',
  //     type: 'timestamp',
  //     default: () => 'CURRENT_TIMESTAMP(6)',
  //   })
  //   createAt: Date;

  //   @UpdateDateColumn({
  //     name: 'update_at',
  //     type: 'timestamp',
  //     default: () => 'CURRENT_TIMESTAMP(6)',
  //   })
  //   updateAt: Date;
}
