import { Denuncia } from 'src/denuncias/entities/denuncia.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'movimiento' })
export class Movimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  tabla_afectada: string;

  @Column({ type: 'int' })
  entidad_id: number;

  @ManyToOne(() => Denuncia, (e) => e.movimiento)
  @JoinColumn({ name: 'denuncia_id' })
  denuncia: Denuncia;

  @Column({
    type: 'enum',
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    default: 'CREATE',
  })
  tipo_cambio: string;

  @Column({ type: 'varchar', length: 255 })
  valor_nuevo: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, (d) => d.denunciaEstados)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

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
