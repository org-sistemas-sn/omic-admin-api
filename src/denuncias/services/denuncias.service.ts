import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Equal, FindOptionsWhere, Like, Repository } from 'typeorm';

import { Denuncia } from '../entities/denuncia.entity';
import { CreateComplaintDto } from '../dtos/denuncia.dto';
import { AutorizadosService } from './autorizados.service';
import { DenunciantesService } from './denunciantes.service';
import { DenunciadosService } from './denunciados.service';
import { EstadosService } from './estados.service';
import { FilterComplaintDto } from '../dtos/filter.dto';
import { createDocx } from '../../utils/docxGen';
import { DenunciaEstadosService } from './denuncia-estados.service';
import { FtpService } from 'src/ftp/ftp.service';
import { Readable } from 'stream';
import { TemplateService } from 'src/template/template.service';
import * as FormData from 'form-data';
import axios from 'axios';
import { DatosNotificacionService } from './datos-notificacion.service';
import { DocumentosTiposService } from 'src/documentosTipo/services/documentosTipos.service';
import { DenunciaDocumentosService } from './denuncia-documentos.service';
import { WeekDays } from '../utils/constants';

@Injectable()
export class DenunciasService {
  private _dir = '/images/omic-admin-dev/causas';
  constructor(
    @InjectRepository(Denuncia) private denunciaRepo: Repository<Denuncia>,
    private autorizadoService: AutorizadosService,
    private denunciantesService: DenunciantesService,
    private denunciadosService: DenunciadosService,
    private estadosService: EstadosService,
    private denunciaEstadosService: DenunciaEstadosService,
    private ftpService: FtpService,
    private templateService: TemplateService,
    private datosNotificacionService: DatosNotificacionService,
    private documentosTiposService: DocumentosTiposService,
    private denunciaDocumentosService: DenunciaDocumentosService,
  ) {}

  async create(data: CreateComplaintDto) {
    const { autorizado, denunciante, denunciados, ...complaint } = data;
    try {
      let licenced;
      if (autorizado) {
        licenced = await this.autorizadoService.create(autorizado);
      }
      const informer = await this.denunciantesService.create(
        denunciante,
        licenced,
      );
      // const state = await this.estadosService.findOne(1);
      const newComplaint = this.denunciaRepo.create(complaint);
      // newComplaint.estado = state;
      newComplaint.denunciante = informer;
      const complaintSaved = await this.denunciaRepo.save(newComplaint);
      await this.denunciadosService.createByArray(denunciados, complaintSaved);
      return complaintSaved;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async findAll(params?: FilterComplaintDto) {
    try {
      const relations = [
        'estado',
        'autorizado',
        'denunciante',
        'archivos',
        'denunciadoDenuncia',
        'denunciadoDenuncia.denunciado',
        // 'denunciados.empresa',
        // 'foja',
        // 'foja.archivos',
        'denunciaDocumentos',
        'denunciaDocumentos.documentoTipo',
        'denunciaEstados',
      ];
      if (params) {
        const where: FindOptionsWhere<Denuncia> = {};
        const { limit, offset } = params;
        const { nombre, apellido, dni, email, estado, orden = 'DESC' } = params;

        if (nombre && !apellido)
          where.denunciante = { nombre: Like(`%${nombre}%`) };
        if (apellido && !nombre)
          where.denunciante = { apellido: Like(`%${apellido}%`) };
        if (nombre && apellido)
          where.denunciante = {
            nombre: Like(`%${nombre}%`),
            apellido: Like(`%${apellido}%`),
          };
        // if (fechaInicio) where.createdAt = Like(`%${fechaInicio}%`);
        if (dni) where.denunciante = { dni: Like(`%${dni}%`) };
        if (email) where.denunciante = { email: Like(`%${email}%`) };
        // if (estadoGeneral) where.estadoGeneral = estadoGeneral;

        if (estado) {
          where.estado = Equal(estado);
        }

        if (!limit) {
          return this.denunciaRepo.find({ relations, where });
        }

        return this.denunciaRepo.find({
          relations,
          where,
          take: limit,
          skip: offset,
          order: {
            id: orden,
          },
        });
      }
      return this.denunciaRepo.find({ relations });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(id: number) {
    const relations = [
      // 'estado',
      'autorizado',
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
      // 'denunciados.empresa',
      // 'foja',
      // 'foja.archivos',
    ];
    const complaint = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });
    if (!complaint) {
      throw new NotFoundException();
    }
    return complaint;
  }

  async downloadDocx(id: number) {
    const relations = [
      // 'estado',
      'autorizado',
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
      // 'denunciados.empresa',
      // 'foja',
      // 'foja.archivos',
    ];
    const complaint = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });
    if (!complaint) {
      throw new NotFoundException();
    }

    const docx = await createDocx(complaint);

    return docx;
  }

  async update(id: number, changes) {
    const complaint = await this.denunciaRepo.findOneBy({ id });
    if (!complaint) {
      throw new NotFoundException();
    }
    this.denunciaRepo.merge(complaint, changes);
    return this.denunciaRepo.save(complaint);
  }

  async aprobbed(data) {
    const {
      id,
      denunciante_email,
      denunciados,
      meet_link,
      date_link,
      time_link,
      userId,
    } = data;

    const relations = [
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
    ];

    const complaint = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!complaint) {
      throw new NotFoundException();
    }
    const estado = await this.estadosService.findByKey('ACEPTADO');

    this.denunciaRepo.merge(complaint, { estado });

    const denunciaEstado = await this.denunciaEstadosService.create({
      denunciaId: id,
      estadoId: estado,
      usuarioId: userId,
    });

    await this.datosNotificacionService.create({
      ...data,
      denunciaEstado: denunciaEstado,
    });

    const dia = new Date().getDate();
    const mes = new Date().getMonth() + 1;
    const año = new Date().getFullYear();
    const [year_meet, month_meet, day_meet] = date_link.split('-');
    const weekday_meet = WeekDays[new Date(date_link).getDay()];
    const nro_expediente = `${id}/${complaint.denunciante.apellido[0]}/${año}`;

    const info = {
      nro_expediente,
      dia,
      mes,
      año,
      denunciante: `${complaint.denunciante.apellido} ${complaint.denunciante.nombre}`,
      denunciado: `${complaint.denunciadoDenuncia[0].denunciado.nombre}${
        complaint.denunciadoDenuncia?.length > 1 ? ' y otros.' : ''
      }`,
      direccion_denunciante: complaint.denunciante.denuncia,
      localidad_denunciante: complaint.denunciante.localidad,
      cod_postal_denunciante: complaint.denunciante.codPostal,
      provincia_denunciante: 'Buenos Aires',
      tel_denunciante:
        complaint.denunciante.telefono || complaint.denunciante.telefonoAlter,
      email_denunciante: denunciante_email,
      email_denunciado: `${denunciados[0]}${
        complaint.denunciadoDenuncia?.length > 1 ? ' y otros.' : ''
      }`,
      link_meet: meet_link,
      year_meet,
      month_meet,
      day_meet,
      weekday_meet,
      hhmm_meet: time_link,
    };

    const filesData = [
      {
        ...info,
        email: denunciante_email,
        message: `Su denuncia contra ${info.denunciado} fue`,
        key: 'CEDULA_APERTURA_DENUNCIANTE',
        filename: `${id}_CEDULA_DENUNCIANTE_${Date.now()}.docx`,
        template: 'CEDULA_APERTURA_DENUNCIANTE.docx',
      },
      {
        ...info,
        email: denunciados,
        message: 'La denuncia en su contra fue',
        key: 'CEDULA_APERTURA_DENUNCIADO',
        filename: `${id}_CEDULA_DENUNCIADO_${Date.now()}.docx`,
        template: 'CEDULA_APERTURA_DENUNCIADO.docx',
      },
    ];

    const caratula_key = 'CARATULA';
    const caratula_filename = `${id}_CARATULA_${Date.now()}.docx`;
    const caratula_template = 'CARATULA.docx';

    const caratula: any = await this.templateService.createDocx(
      info,
      caratula_template,
    );

    const apertura_key = 'APERTURA_INSTANCIA';
    const apertura_filename = `${id}_APERTURA_INSTANCIA_${Date.now()}.docx`;
    const apertura_template = 'APERTURA_DE_INSTANCIA.docx';

    const apertura: any = await this.templateService.createDocx(
      info,
      apertura_template,
    );

    // GUARDAR CARATULA
    await this.ftpService.connect();
    const ruta = `${this._dir}/${id}`;
    await this.ftpService.createDir(ruta);
    this.ftpService.close();

    const stream = Readable.from(caratula);
    const remotePath = ruta + `/${caratula_filename}`;
    await this.ftpService.fileUpload(stream, remotePath);

    const documentoTipo = await this.documentosTiposService.findByKey(
      caratula_key,
    );

    await this.denunciaDocumentosService.create({
      denunciaId: complaint.id,
      documentoTipoId: documentoTipo.id,
      fileName: caratula_filename,
      path: remotePath,
    });

    // GUARDAR APERTURA
    const apertura_stream = Readable.from(apertura);
    const apertura_remotePath = ruta + `/${apertura_filename}`;
    await this.ftpService.fileUpload(apertura_stream, apertura_remotePath);

    const apertura_documentoTipo = await this.documentosTiposService.findByKey(
      apertura_key,
    );

    await this.denunciaDocumentosService.create({
      denunciaId: complaint.id,
      documentoTipoId: apertura_documentoTipo.id,
      fileName: apertura_filename,
      path: apertura_remotePath,
    });

    const files = [
      {
        filename: apertura_filename,
        file: apertura,
      },
    ];

    for (const e of filesData) {
      const file: any = await this.templateService.createDocx(e, e.template);

      if (e.email) {
        const form = new FormData();
        const dataNot = [
          {
            email: e.email,
            bodyEmail: {
              message: e.message,
            },
            files: [apertura_filename, e.filename],
          },
        ];

        form.append('method', 'denuncia_aprobada');
        form.append('data', JSON.stringify({ data: dataNot }));
        form.append('hasFiles', 'true');
        form.append(apertura_filename, apertura, {
          filename: apertura_filename,
        });
        form.append(e.filename, file, { filename: e.filename });

        await axios.post(
          'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications',
          form,
          {
            headers: {
              'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
            },
          },
        );
      }

      const stream = Readable.from(file);
      const remotePath = ruta + `/${e.filename}`;

      await this.ftpService.fileUpload(stream, remotePath);

      files.push({
        file,
        filename: e.filename,
      });

      const documentoTipo = await this.documentosTiposService.findByKey(e.key);

      await this.denunciaDocumentosService.create({
        denunciaId: complaint.id,
        documentoTipoId: documentoTipo.id,
        fileName: e.filename,
        path: remotePath,
      });
    }

    const form = new FormData();
    const dataNot = [
      {
        email: 'omicsannicolas@sannicolas.gob.ar',
        bodyEmail: {
          message: `Documentos de la denuncia Expte: Nº ${info.nro_expediente}`,
        },
        files: files.map((e) => e.filename),
      },
      {
        email: 'joseilucci@gmail.com',
        bodyEmail: {
          message: `Documentos de la denuncia Expte: Nº ${info.nro_expediente}`,
        },
        files: files.map((e) => e.filename),
      },
    ];

    form.append('method', 'denuncia_omic');
    form.append('data', JSON.stringify({ data: dataNot }));
    form.append('hasFiles', 'true');

    files.forEach((e) => {
      form.append(e.filename, e.file, { filename: e.filename });
    });

    axios.post(
      'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications',
      form,
      {
        headers: {
          'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
        },
      },
    );

    return this.denunciaRepo.save(complaint);
  }

  async reject(data) {
    const { id, denunciante_email, motivo, enviar_mail, userId } = data;

    const relations = [
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
    ];

    const complaint = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!complaint) {
      throw new NotFoundException();
    }
    const estado = await this.estadosService.findByKey('RECHAZADO');
    this.denunciaRepo.merge(complaint, { estado });

    const denunciaEstado = await this.denunciaEstadosService.create({
      denunciaId: id,
      estadoId: estado,
      motivo,
      usuarioId: userId,
    });

    await this.datosNotificacionService.create({
      ...data,
      denunciaEstado: denunciaEstado,
    });

    if (enviar_mail) {
      const dataNot = {
        method: 'denuncia_rechazada',
        data: [
          {
            email: denunciante_email,
            bodyEmail: {
              message: `Su denuncia contra ${`${complaint.denunciadoDenuncia[0].denunciado.nombre}`} fue:`,
              motivo,
            },
          },
        ],
      };

      await axios.post(
        'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications',
        dataNot,
        {
          headers: {
            'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
          },
        },
      );
    }

    return this.denunciaRepo.save(complaint);
  }

  async revert(data) {
    const { id, userId } = data;

    const relations = ['denunciante', 'denunciaDocumentos'];

    const complaint = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!complaint) {
      throw new NotFoundException();
    }

    // for (const e of complaint.denunciaDocumentos) {
    //   await this.ftpService.remove(e.path);

    //   await this.denunciaDocumentosService.delete(e);
    // }

    const estado = await this.estadosService.findByKey('RECIBIDA');
    this.denunciaRepo.merge(complaint, { estado });

    const denunciaEstado = await this.denunciaEstadosService.create({
      denunciaId: id,
      estadoId: estado,
      usuarioId: userId,
    });

    await this.datosNotificacionService.create({
      ...data,
      denunciaEstado: denunciaEstado,
    });

    return this.denunciaRepo.save(complaint);
  }
}
