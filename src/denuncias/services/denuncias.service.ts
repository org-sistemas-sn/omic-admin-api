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
import { DenunciadoDenunciaService } from './denunciado-denuncia.service';

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
    private denunciadoDenunciaService: DenunciadoDenunciaService,
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
      nro_expediente,
    } = data;

    const relations = [
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
      'archivos',
    ];

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!denuncia) {
      throw new NotFoundException();
    }
    const estado = await this.estadosService.findByKey('ACEPTADO');

    this.denunciaRepo.merge(denuncia, { estado });

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
    const mes = new Date().toLocaleString('es-AR', { month: 'long' });
    const año = new Date().getFullYear();
    const [year_meet, month_meet, day_meet] = date_link.split('-');
    const weekday_meet = WeekDays[new Date(date_link).getDay()];
    // const nro_expediente = `${id}/${complaint.denunciante.apellido[0]}/${año}`;

    const info = {
      nro_expediente,
      dia,
      mes,
      año,
      denunciante: `${denuncia.denunciante.apellido} ${denuncia.denunciante.nombre}`,
      // denunciado: `${complaint.denunciadoDenuncia[0].denunciado.nombre}${
      //   complaint.denunciadoDenuncia?.length > 1 ? ' y otros.' : ''
      // }`,
      denunciado: denuncia.denunciadoDenuncia.reduce((prev, current) => {
        if (prev) {
          return prev + `, ${current.denunciado.nombre}`;
        } else {
          return current.denunciado.nombre;
        }
      }, ''),
      direccion_denunciante: denuncia.denunciante.denuncia,
      localidad_denunciante: denuncia.denunciante.localidad,
      cod_postal_denunciante: denuncia.denunciante.codPostal,
      provincia_denunciante: 'Buenos Aires',
      tel_denunciante:
        denuncia.denunciante.telefono || denuncia.denunciante.telefonoAlter,
      email_denunciante: denunciante_email,
      // email_denunciado: `${denunciados[0]}${
      //   complaint.denunciadoDenuncia?.length > 1 ? ' y otros.' : ''
      // }`,
      link_meet: meet_link,
      year_meet,
      month_meet,
      day_meet,
      weekday_meet,
      hhmm_meet: time_link,
    };

    const denuncianteFiles = {
      message: `Su denuncia contra ${info.denunciado} fue`,
      key: 'CEDULA_APERTURA_DENUNCIANTE',
      filename: `${id}_CEDULA_DENUNCIANTE_${Date.now()}.docx`,
      template: 'CEDULA_APERTURA_DENUNCIANTE.docx',
    };

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

    // CREAR CARPETA
    await this.ftpService.connect();
    const ruta = `${this._dir}/${id}`;
    await this.ftpService.createDir(ruta);
    this.ftpService.close();

    // GUARDAR CARATULA
    const streamFile = Readable.from(caratula);
    const remotePathFile = ruta + `/${caratula_filename}`;
    await this.ftpService.fileUpload(streamFile, remotePathFile);

    const documentoTipo = await this.documentosTiposService.findByKey(
      caratula_key,
    );

    await this.denunciaDocumentosService.create({
      denunciaId: denuncia.id,
      documentoTipoId: documentoTipo.id,
      fileName: caratula_filename,
      path: remotePathFile,
    });

    // GUARDAR APERTURA
    const apertura_stream = Readable.from(apertura);
    const apertura_remotePath = ruta + `/${apertura_filename}`;
    await this.ftpService.fileUpload(apertura_stream, apertura_remotePath);

    const apertura_documentoTipo = await this.documentosTiposService.findByKey(
      apertura_key,
    );

    await this.denunciaDocumentosService.create({
      denunciaId: denuncia.id,
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

    //
    // DENUNCIANTE
    const file: any = await this.templateService.createDocx(
      info,
      denuncianteFiles.template,
    );

    if (denunciante_email.email) {
      const form = new FormData();
      const dataNot = [
        {
          email: denunciante_email.email,
          bodyEmail: {
            message: denuncianteFiles.message,
          },
          files: [apertura_filename, denuncianteFiles.filename],
        },
      ];

      form.append('method', 'denuncia_aprobada');
      form.append('data', JSON.stringify({ data: dataNot }));
      form.append('hasFiles', 'true');
      form.append(apertura_filename, apertura, {
        filename: apertura_filename,
      });
      form.append(denuncianteFiles.filename, file, {
        filename: denuncianteFiles.filename,
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
    }

    const stream = Readable.from(file);
    const remotePath = ruta + `/${denuncianteFiles.filename}`;

    this.ftpService.fileUpload(stream, remotePath);

    files.push({
      file,
      filename: denuncianteFiles.filename,
    });

    const documento = await this.documentosTiposService.findByKey(
      denuncianteFiles.key,
    );

    this.denunciaDocumentosService.create({
      denunciaId: denuncia.id,
      documentoTipoId: documento.id,
      fileName: denuncianteFiles.filename,
      path: remotePath,
    });

    const form = new FormData();
    const dataNot = [
      // {
      //   email: 'omicsannicolas@sannicolas.gob.ar',
      //   bodyEmail: {
      //     message: `Documentos de la denuncia Expte: Nº ${info.nro_expediente}`,
      //   },
      //   files: files.map((e) => e.filename),
      // },
      {
        email: 'braian.silva97@gmail.com',
        bodyEmail: {
          message: `Documentos de la denuncia Expte: Nº ${nro_expediente}`,
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

    denuncia.nroExpediente = nro_expediente;
    return this.denunciaRepo.save(denuncia);
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

    this.datosNotificacionService.create({
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

      axios.post(
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

    for (const e of complaint.denunciaDocumentos) {
      await this.ftpService.remove(e.path);

      await this.denunciaDocumentosService.delete(e);
    }

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

  async sendDenunciandosMails(data) {
    const {
      id,
      denunciante_email,
      denunciados,
      meet_link,
      date_link,
      time_link,
      nro_expediente,
    } = data;

    const denuncia = await this.getDenuncia(id);
    const fechaActual = this.getFechaActual();
    const fechaReunion = this.parseFechaReunion(date_link);
    const info = this.buildInfo(
      denuncia,
      denunciados,
      fechaActual,
      fechaReunion,
      meet_link,
      time_link,
      denunciante_email,
      nro_expediente,
    );

    const denunciaData = {
      ...denuncia,
      denunciados: denunciados.map((e) => {
        return {
          ...e,
          dni: e.dniCuilCuit,
          codpostal: e.codPostal,
          tel: e.telefono,
          telalt: e.telefonoAlter,
        };
      }),
    };
    const denunciaFile = await this.templateService.createDocx(
      denunciaData,
      'DENUNCIA.docx',
    );
    const aperturaFile = await this.templateService.createDocx(
      info,
      'APERTURA_DE_INSTANCIA.docx',
    );

    const files = [
      {
        filename: `${id}_DENUNCIA_${Date.now()}.docx`,
        file: denunciaFile,
      },
      {
        filename: `${id}_APERTURA_INSTANCIA_${Date.now()}.docx`,
        file: aperturaFile,
      },
    ];

    this.getArchivosAdjuntos(denuncia)
      .then((archivos) => {
        for (const denunciado of denunciados) {
          this.procesarDenunciado(
            denunciado,
            info,
            files,
            archivos,
            id,
            denuncia,
          );
        }
      })
      .then(() => {
        return this.ftpService.close();
      });

    return { ok: true };
  }

  private async getDenuncia(id) {
    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations: [
        'autorizado',
        'denunciante',
        'archivos',
        'denunciadoDenuncia',
        'denunciadoDenuncia.denunciado',
      ],
    });

    if (!denuncia) throw new NotFoundException();
    return denuncia;
  }

  private buildInfo(
    denuncia,
    denunciados,
    fechaActual,
    fechaReunion,
    meet_link,
    time_link,
    denunciante_email,
    nro_expediente,
  ) {
    return {
      nro_expediente,
      ...fechaActual,
      denunciante: `${denuncia.denunciante.apellido} ${denuncia.denunciante.nombre}`,
      denunciado: this.formatDenunciados(denuncia),
      direccion_denunciante: denuncia.denunciante.denuncia,
      localidad_denunciante: denuncia.denunciante.localidad,
      cod_postal_denunciante: denuncia.denunciante.codPostal,
      provincia_denunciante: 'Buenos Aires',
      tel_denunciante:
        denuncia.denunciante.telefono || denuncia.denunciante.telefonoAlter,
      email_denunciante: denunciante_email,
      link_meet: meet_link,
      ...fechaReunion,
      hhmm_meet: time_link,
    };
  }

  private formatDenunciados(denuncia) {
    return denuncia.denunciadoDenuncia.reduce(
      (prev, current) =>
        prev
          ? `${prev}, ${current.denunciado.nombre}`
          : current.denunciado.nombre,
      '',
    );
  }

  private async getArchivosAdjuntos(denuncia) {
    const archivos = [];
    for (const archivo of denuncia.archivos) {
      const buffer = await this.ftpService.downloadFileAsBuffer(
        archivo.descripcion,
      );
      const filename = archivo.descripcion.split('/omic/')[1];
      archivos.push({ ...archivo, buffer, filename });
    }
    return archivos;
  }

  private async procesarDenunciado(
    denunciado,
    info,
    files,
    archivos,
    id,
    denuncia,
  ) {
    console.log('procesarDenunciado');

    const denunciadosFiles = {
      message: 'La denuncia en su contra fue',
      key: 'CEDULA_APERTURA_DENUNCIADO',
      filename: `${id}_CEDULA_DENUNCIADO_${Date.now()}.docx`,
      template: 'CEDULA_APERTURA_DENUNCIADO.docx',
    };
    try {
      const file = await this.templateService.createDocx(
        {
          ...info,
          denunciado: denunciado.nombre,
          email_denunciado: denunciado.email,
        },
        denunciadosFiles.template,
      );
      console.log('denunciado.email', denunciado.email);
      await this.uploadFileToFTP(file, id, denunciadosFiles.filename);
      await this.saveDocumentRecord(
        denuncia.id,
        denunciadosFiles.key,
        denunciadosFiles.filename,
        `${this._dir}/${id}/${denunciadosFiles.filename}`,
      );

      if (denunciado.email) {
        await this.sendNotification(
          denunciado,
          files,
          archivos,
          file,
          denunciadosFiles,
        );
      }
    } catch (err) {
      console.log(err);
    }
  }

  private async sendNotification(
    denunciado,
    files,
    archivos,
    file,
    denunciadosFiles,
  ) {
    const form = new FormData();
    const dataNot = [
      {
        email: denunciado.email,
        bodyEmail: { message: denunciadosFiles.message },
        files: files.map((f) => f.filename),
      },
    ];

    archivos.forEach((archivo) => {
      if (archivo.buffer && archivo.filename) {
        dataNot[0].files.push(archivo.filename);
        form.append(archivo.filename, archivo.buffer, {
          filename: archivo.filename,
        });
      }
    });
    files.forEach((archivo) => {
      if (archivo.file && archivo.filename) {
        dataNot[0].files.push(archivo.filename);
        form.append(archivo.filename, archivo.file, {
          filename: archivo.filename,
        });
      }
    });

    form.append('method', 'denuncia_aprobada');
    form.append('data', JSON.stringify({ data: dataNot }));
    form.append('hasFiles', 'true');

    form.append(denunciadosFiles.filename, file, {
      filename: denunciadosFiles.filename,
    });
    console.log('dataNot', dataNot);
    return axios.post(
      'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications',
      form,
      {
        headers: { 'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB' },
      },
    );
  }

  private async uploadFileToFTP(file, id, filename) {
    const remotePath = `${this._dir}/${id}/${filename}`;
    const stream = Readable.from(file);
    await this.ftpService.fileUpload(stream, remotePath);
  }

  private async saveDocumentRecord(denunciaId, key, filename, path) {
    const documentoTipo = await this.documentosTiposService.findByKey(key);
    await this.denunciaDocumentosService.create({
      denunciaId,
      documentoTipoId: documentoTipo.id,
      fileName: filename,
      path,
    });
  }

  private getFechaActual() {
    const now = new Date();
    return {
      dia: now.getDate(),
      mes: now.toLocaleString('es-AR', { month: 'long' }),
      año: now.getFullYear(),
    };
  }

  private parseFechaReunion(date_link) {
    const [year_meet, month_meet, day_meet] = date_link.split('-');
    const weekday_meet = WeekDays[new Date(date_link).getDay()];
    return { year_meet, month_meet, day_meet, weekday_meet };
  }

  async addDenunciado(data) {
    const {
      id,
      meet_link,
      date_link,
      time_link,
      userId,

      nombre,
      dniCuilCuit,
      domicilio,
      localidad,
      codPostal,
      telefono,
      telefonoAlter,
      email,
    } = data;

    const denuncia = await this.getDenuncia(id);

    if (!denuncia) {
      throw new NotFoundException();
    }
    const denunciado = await this.denunciadosService.create({
      nombre,
      dniCuilCuit,
      domicilio,
      localidad,
      codPostal,
      telefono,
      telefonoAlter,
      email,
    });

    await this.denunciadoDenunciaService.create({
      denuncia,
      denunciado,
    });

    const dia = new Date().getDate();
    const mes = new Date().toLocaleString('es-AR', { month: 'long' });
    const año = new Date().getFullYear();
    const [year_meet, month_meet, day_meet] = date_link.split('-');
    const weekday_meet = WeekDays[new Date(date_link).getDay()];
    // const nro_expediente = `${id}/${complaint.denunciante.apellido[0]}/${año}`;

    const info = {
      nro_expediente: denuncia.nroExpediente,
      dia,
      mes,
      año,
      denunciante: `${denuncia.denunciante.apellido} ${denuncia.denunciante.nombre}`,

      denunciado: nombre,
      direccion_denunciante: denuncia.denunciante.denuncia,
      localidad_denunciante: denuncia.denunciante.localidad,
      cod_postal_denunciante: denuncia.denunciante.codPostal,
      provincia_denunciante: 'Buenos Aires',
      tel_denunciante:
        denuncia.denunciante.telefono || denuncia.denunciante.telefonoAlter,

      link_meet: meet_link,
      year_meet,
      month_meet,
      day_meet,
      weekday_meet,
      hhmm_meet: time_link,
    };

    const denunciadosFiles = {
      message: 'La denuncia en su contra fue',
      key: 'CEDULA_APERTURA_DENUNCIADO',
      filename: `${id}_CEDULA_DENUNCIADO_${Date.now()}.docx`,
      template: 'CEDULA_APERTURA_DENUNCIADO.docx',
    };

    const denunciaFile = await this.templateService.createDocx(
      denuncia,
      'DENUNCIA.docx',
    );
    const files = [
      {
        filename: `${id}_DENUNCIA_${Date.now()}.docx`,
        file: denunciaFile,
      },
    ];
    console.log(denunciaFile);
    //
    // DENUNCIADOS
    const archivos = [];
    for (const archivo of denuncia.archivos) {
      const buffer = await this.ftpService.downloadFileAsBuffer(
        archivo.descripcion,
      );

      const filename = archivo.descripcion.split('/omic/')[1];

      archivos.push({
        ...archivo,
        buffer,
        filename,
      });
    }

    try {
      const file: any = await this.templateService.createDocx(
        {
          ...info,
          denunciado: denunciado.nombre,
          email_denunciado: denunciado.email,
        },
        denunciadosFiles.template,
      );

      if (denunciado.email) {
        const form = new FormData();
        const dataNot = [
          {
            email: denunciado.email,
            bodyEmail: {
              message: denunciadosFiles.message,
            },
            files: [denunciadosFiles.filename],
          },
        ];

        for (const archivo of archivos) {
          if (archivo.buffer && archivo.filename) {
            dataNot[0].files.push(archivo.filename);

            form.append(archivo.filename, archivo.buffer, {
              filename: archivo.filename,
            });
          }
        }
        form.append('method', 'denuncia_aprobada');
        form.append('data', JSON.stringify({ data: dataNot }));
        form.append('hasFiles', 'true');

        form.append(denunciadosFiles.filename, file, {
          filename: denunciadosFiles.filename,
        });

        console.log(dataNot);
        axios.post(
          'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications',
          form,
          {
            headers: {
              'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
            },
          },
        );
      }

      const ruta = `${this._dir}/${id}`;
      const stream = Readable.from(file);
      const remotePath = ruta + `/${denunciadosFiles.filename}`;

      this.ftpService.fileUpload(stream, remotePath);

      files.push({
        file,
        filename: denunciadosFiles.filename,
      });

      const documentoTipo = await this.documentosTiposService.findByKey(
        denunciadosFiles.key,
      );

      await this.denunciaDocumentosService.create({
        denunciaId: denuncia.id,
        documentoTipoId: documentoTipo.id,
        fileName: denunciadosFiles.filename,
        path: remotePath,
      });
    } catch (err) {
      console.log(err);
    }

    return denunciado;
  }
}
