import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';

import { Denuncia } from 'src/denuncias/entities/denuncia.entity';
import { Archivo } from './archivo.entity';

@Entity({ name: 'fojas' })
export class Foja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  ruta: string;

  @OneToOne(() => Denuncia, (denuncia) => denuncia.estado)
  denuncia: Denuncia;

  @OneToMany(() => Archivo, (archivo) => archivo.foja)
  archivos: Archivo[];

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
