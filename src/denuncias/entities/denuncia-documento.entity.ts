import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Denuncia } from './denuncia.entity';
import { Denunciado } from './denunciado.entity';
import { DatosNotificacion } from './datos-notificacion.entity';
import { DocumentosTipos } from 'src/documentosTipo/entities/documentosTipos.entity';

@Entity({ name: 'Denuncia_Documentos' })
export class DenunciaDocumentos {
  @PrimaryGeneratedColumn({ name: 'Id_Denuncia_Documentos' })
  denunciaDocumentosId: number;

  @Column({ type: 'int', name: 'Id_Denuncia' })
  denunciaId: number;

  @Column({ type: 'varchar', length: 100 })
  fileName: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'varchar', length: 255 })
  documentName: string;

  @Column({ type: 'int', name: 'Id_documento_tipo' })
  documentoTipoId: number;

  @ManyToOne(() => Denuncia, (d) => d.denunciaDocumentos)
  @JoinColumn({ name: 'Id_Denuncia' })
  denuncia: Denuncia;

  @ManyToOne(() => DocumentosTipos, (d) => d.denunciaDocumentos)
  @JoinColumn({ name: 'Id_documento_tipo' })
  documentoTipo: DocumentosTipos;
}
