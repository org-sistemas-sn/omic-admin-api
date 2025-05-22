import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CausaNoDigitalizada } from './causaNoDigitalizada.entity';

@Entity('denunciados_no_digitalizados')
export class DenunciadoNoDigitalizado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @ManyToOne(() => CausaNoDigitalizada, (causa) => causa.denunciados, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'causa_id' })
  causa: CausaNoDigitalizada;
}
