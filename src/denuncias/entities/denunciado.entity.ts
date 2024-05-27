import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

import { DenunciadoDenuncia } from './denuncia-denunciado.entity';
// import { Empresa } from 'src/empresas/entities/empresa.entity';
// import { Denuncia } from './denuncia.entity';

@Entity({ name: 'Denunciado' })
export class Denunciado {
  @PrimaryGeneratedColumn({ name: 'Id_Denunciado' })
  id: number;

  @Column({ type: 'text', name: 'Nombre' })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 45,
    name: 'DNI',
    nullable: true,
  })
  dniCuilCuit: string;

  @Column({ type: 'varchar', length: 255, name: 'Email', nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 90, name: 'Telefono', nullable: true })
  telefono: string;

  @Column({
    type: 'varchar',
    length: 90,
    nullable: true,
    name: 'Telefono_Alter',
  })
  telefonoAlter: string;

  @Column({ type: 'varchar', length: 90, name: 'Domicilio', nullable: true })
  domicilio: string;

  @Column({ type: 'varchar', length: 90, name: 'Localidad', nullable: true })
  localidad: string;

  @Column({
    type: 'varchar',
    length: 45,
    name: 'Codigo_Postal',
    nullable: true,
  })
  codPostal: string;

  @OneToMany(
    () => DenunciadoDenuncia,
    (denunciadoDenuncia) => denunciadoDenuncia.denunciado,
  )
  denunciadoDenuncia: DenunciadoDenuncia[];

  // @ManyToOne(() => Empresa)
  // @JoinColumn({ name: 'empresa_id' })
  // empresa: Empresa;
}
