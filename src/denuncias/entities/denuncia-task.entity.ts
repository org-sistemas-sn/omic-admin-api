import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';

@Entity('denuncia_tasks')
export class DenunciaTasks {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Denuncia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'denuncia_id' })
  denuncia: Denuncia;

  @Column({ type: 'varchar', length: 50 })
  etapa: string; // 'DOCUMENTOS', 'NOTIFICACION', etc.

  @Column({ type: 'varchar', length: 20, default: 'EN_COLA' })
  estado: 'EN_COLA' | 'EJECUTADO' | 'FALLIDO';

  @Column({ type: 'int', default: 1 })
  prioridad: number;

  @Column({ type: 'int', default: 0 })
  intentos: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_creacion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_ejecucion: Date;

  @Column({ type: 'varchar', length: 100 })
  jobId: string;

  @Column({ type: 'text', nullable: true })
  error: string | null;
}
