// src/causas/entities/causaNoDigitalizada.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DenunciadoNoDigitalizado } from './denunciadoNoDigitalizado.entity';

@Entity('causas_no_digitalizadas')
export class CausaNoDigitalizada {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nro_expediente' })
  nroExpediente: string;

  @Column()
  denunciante: string;

  @Column({ name: 'fecha_inicio', nullable: true })
  fechaInicio: string;

  @Column({ nullable: true })
  estado: string;

  @OneToMany(() => DenunciadoNoDigitalizado, (denunciado) => denunciado.causa, {
    cascade: true,
  })
  denunciados: DenunciadoNoDigitalizado[];
}
