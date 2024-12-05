import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { DenunciaEstados } from 'src/denuncias/entities/denuncia-estado.entity';
import { Movimiento } from 'src/movimientos/entities/movimiento.entity';

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  apellido: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Exclude()
  @Column({ nullable: true, name: 'refresh_token' })
  refreshToken: string;

  @OneToMany(() => DenunciaEstados, (e) => e.usuario)
  denunciaEstados: DenunciaEstados[];

  @OneToMany(() => Movimiento, (e) => e.usuario)
  movimientos: Movimiento[];

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
