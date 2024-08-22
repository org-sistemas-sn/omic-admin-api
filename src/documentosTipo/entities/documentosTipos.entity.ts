import { DenunciaDocumentos } from 'src/denuncias/entities/denuncia-documento.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity({ name: 'documentos_tipos' })
export class DocumentosTipos {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'boolean', default: 1 })
  show: boolean;

  @OneToMany(() => DenunciaDocumentos, (d) => d.documentoTipo)
  denunciaDocumentos: DenunciaDocumentos[];

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
