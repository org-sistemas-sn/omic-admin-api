import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';
import { DenunciaEstados } from './denuncia-estado.entity';

@Entity({ name: 'estados' })
export class Estado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'int' })
  nivel: number;

  @Column({ type: 'int' })
  parentId: number;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'int2', default: 1 })
  show: number;

  @OneToMany(() => Denuncia, (denuncia) => denuncia.estado)
  denuncias: Denuncia[];

  @OneToMany(() => DenunciaEstados, (denuncia) => denuncia.estado)
  denunciaEstados: DenunciaEstados[];

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
