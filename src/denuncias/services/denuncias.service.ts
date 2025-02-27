import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Equal,
  FindOperator,
  FindOptionsWhere,
  In,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

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
import { Months, WeekDays } from '../utils/constants';
import { DenunciadoDenunciaService } from './denunciado-denuncia.service';
import { DireccionesEnviadasService } from './direcciones-enviadas.service';
import { MovimientoService } from 'src/movimientos/services/movimientos.service';
import { CausasService } from 'src/causas/services/causa.service';
import { generatePDF } from '../utils/generatePDF';

import config from 'src/config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class DenunciasService {
  private _dir = '/images/omic-admin-dev/causas';
  private readonly startDateDenuncia: string;
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
    private direccionesEnviadasService: DireccionesEnviadasService,
    private movimientoService: MovimientoService,
    @Inject(forwardRef(() => CausasService))
    private causasService: CausasService,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {
    this.startDateDenuncia =
      this.configService.startDateDenuncia || '2024-01-01';
  }

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

  async findDenuncias(params?: FilterComplaintDto) {
    try {
      const relations = [
        'estado',
        'autorizado',
        'denunciante',
        'denunciadoDenuncia',
        'denunciadoDenuncia.denunciado',
        // 'denunciados.empresa',
        // 'foja',
        // 'foja.archivos',
        // 'archivos',
        // 'denunciaDocumentos',
        // 'denunciaDocumentos.documentoTipo',
        'denunciaEstados',
      ];
      if (params) {
        const where: FindOptionsWhere<Denuncia> = {};
        const { limit, offset } = params;
        const {
          denunciante,
          dni,
          email,
          estado,
          date,
          ultMovimiento,
          orden = 'DESC',
        } = params;

        if (this.startDateDenuncia) {
          where.fecha = MoreThanOrEqual(
            new Date(this.startDateDenuncia.replaceAll('-', '/')),
          );
        }

        // if (nombre && !apellido)
        //   where.denunciante = { nombre: Like(`%${nombre}%`) };
        // if (apellido && !nombre)
        //   where.denunciante = { apellido: Like(`%${apellido}%`) };
        // if (nombre && apellido)
        //   where.denunciante = {
        //     nombre: Like(`%${nombre}%`),
        //     apellido: Like(`%${apellido}%`),
        //   };
        if (date) {
          where.fecha = new Date(date.replaceAll('-', '/'));
        }
        if (ultMovimiento) {
          where.ultMovimiento = new Date(ultMovimiento.replaceAll('-', '/'));
        }

        if (denunciante) {
          const words = denunciante.trim().split(' ');
          const denuncianteApellido = words.map((e) => {
            let denuncianteWhere: {
              apellido: FindOperator<string>;
              dni?: FindOperator<string>;
              email?: FindOperator<string>;
            } = {
              apellido: Like(`%${e}%`),
            };
            if (dni) {
              denuncianteWhere = { ...denuncianteWhere, dni: Like(`%${dni}%`) };
            }
            if (email)
              denuncianteWhere = {
                ...denuncianteWhere,
                email: Like(`%${email}%`),
              };

            return denuncianteWhere;
          });
          const denuncianteNombre = words.map((e) => {
            let denuncianteWhere: {
              nombre: FindOperator<string>;
              dni?: FindOperator<string>;
              email?: FindOperator<string>;
            } = {
              nombre: Like(`%${e}%`),
            };
            if (dni) {
              denuncianteWhere = { ...denuncianteWhere, dni: Like(`%${dni}%`) };
            }
            if (email)
              denuncianteWhere = {
                ...denuncianteWhere,
                email: Like(`%${email}%`),
              };

            return denuncianteWhere;
          });

          where.denunciante = [...denuncianteApellido, ...denuncianteNombre];
          // {
          // nombre: words.map((e) => Like(`%${e}%`)),
          // apellido: words.map((e) => Like(`%${e}%`)),
          // };
        } else {
          if (dni) where.denunciante = { dni: Like(`%${dni}%`) };
          if (email) where.denunciante = { email: Like(`%${email}%`) };
        }
        // if (fechaInicio) where.createdAt = Like(`%${fechaInicio}%`);
        // if (estadoGeneral) where.estadoGeneral = estadoGeneral;

        if (estado) {
          where.estado = Equal(estado);
        } else {
          where.estado = In([1, 2, 3]);
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
      'estado',
      'autorizado',
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
      // 'denunciados.empresa',
      // 'foja',
      // 'foja.archivos',
      'datosNotificacion',
      'datosNotificacion.direccionesEnviadas',
      'datosNotificacion.direccionesEnviadas.denunciante',
      'datosNotificacion.direccionesEnviadas.denunciado',
      'datosNotificacion.denunciaEstado',
      'datosNotificacion.denunciaEstado.estado',
      // 'archivos',
      // 'denunciaDocumentos',
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

  private dtoInfo({
    denuncia,

    nro_expediente,

    denunciante_email,
    meet_link,

    time_link,
    date_link,
  }) {
    const dia = new Date().getDate();
    const mes = new Date().toLocaleString('es-AR', { month: 'long' });
    const año = new Date().getFullYear();
    const [year_meet, month_meet, day_meet] = date_link.split('-');
    const weekday_meet = WeekDays[new Date(date_link).getDay()];

    return {
      nro_expediente,
      dia,
      mes,
      año,
      denunciante: `${denuncia.denunciante.apellido} ${denuncia.denunciante.nombre}`,

      denunciado: denuncia.denunciadoDenuncia.reduce((prev, current) => {
        if (prev) {
          return prev + `, ${current.denunciado.nombre}`;
        } else {
          return current.denunciado.nombre;
        }
      }, ''),
      direccion_denunciante: denuncia.denunciante.domicilio,
      localidad_denunciante: denuncia.denunciante.localidad,
      cod_postal_denunciante: denuncia.denunciante.codPostal,
      provincia_denunciante: 'Buenos Aires',
      tel_denunciante:
        denuncia.denunciante.telefono || denuncia.denunciante.telefonoAlter,
      email_denunciante: denunciante_email,

      link_meet: meet_link,
      year_meet,
      month_meet: Months[month_meet],
      day_meet,
      weekday_meet,
      hhmm_meet: time_link,
    };
  }
  async aprobbed(data) {
    const {
      id,
      denunciante_email,
      denunciante_postal,
      denunciados,
      postales,
      meet_link,
      date_link,
      time_link,
      userId,
      nro_expediente,
      envio_tipo,
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
      estadoId: estado.id,
      usuarioId: userId,
    });

    const datosNotificacion = await this.datosNotificacionService.create({
      ...data,
      denuncia,
      denunciaEstado: denunciaEstado,
    });

    await this.direccionesEnviadasService.create({
      datosNotificacionId: datosNotificacion.id,
      denuncianteId: denuncia.denunciante.id,
      email: denunciante_email,
      codPostal: denunciante_postal,
    });

    for (const denunciado of denunciados) {
      await this.direccionesEnviadasService.create({
        datosNotificacionId: datosNotificacion.id,
        denunciadoId: denunciado.id,
        email: denunciado.email,
        // codPostal: denunciado.codPostal,
      });
    }

    for (const denunciado of postales) {
      await this.direccionesEnviadasService.create({
        datosNotificacionId: datosNotificacion.id,
        denunciadoId: denunciado.id,
        // email: denunciado.email,
        codPostal: denunciado.codPostal,
      });
    }

    // const nro_expediente = `${id}/${complaint.denunciante.apellido[0]}/${año}`;

    const info = this.dtoInfo({
      denuncia,
      nro_expediente,
      denunciante_email,
      meet_link,
      time_link,
      date_link,
    });

    const denuncianteFiles = {
      message: `Su denuncia contra ${info.denunciado} fue`,
      key: 'CEDULA_APERTURA_DENUNCIANTE',
      filename: `${id}_CEDULA_DENUNCIANTE_${Date.now()}.pdf`,
      // template: 'CEDULA_APERTURA_DENUNCIANTE.docx',
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
    console.log('Conexion FtpService');
    await this.ftpService.connect();
    const ruta = `${this._dir}/${id}`;
    await this.ftpService.createDir(ruta);
    this.ftpService.close();
    console.log('Carpeta creada');

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
    // const file: any = await this.templateService.createDocx(
    //   info,
    //   denuncianteFiles.template,
    // );
    const file = await generatePDF(info, 'denunciante');

    if (
      denunciante_email &&
      (envio_tipo === 'email' || envio_tipo === 'ambos')
    ) {
      const form = new FormData();
      const dataNot = [
        {
          email: denunciante_email,
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

      if (file) {
        form.append(denuncianteFiles.filename, file, {
          filename: denuncianteFiles.filename,
        });
      }

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

    await this.ftpService.fileUpload(stream, remotePath);

    const documento = await this.documentosTiposService.findByKey(
      denuncianteFiles.key,
    );

    this.denunciaDocumentosService.create({
      denunciaId: denuncia.id,
      documentoTipoId: documento.id,
      fileName: denuncianteFiles.filename,
      path: remotePath,
    });

    const aperturaFile = await this.templateService.createDocx(
      info,
      'APERTURA_DE_INSTANCIA.docx',
    );

    const documentFiles = [
      {
        filename: apertura_filename,
        file: apertura,
      },
      {
        filename: `${id}_APERTURA_INSTANCIA_${Date.now()}.docx`,
        file: aperturaFile,
      },
      {
        file,
        filename: denuncianteFiles.filename,
      },
    ];

    for (const denunciado of denuncia.denunciadoDenuncia) {
      const denunciadosFiles = {
        message: 'La denuncia en su contra fue',
        key: 'CEDULA_APERTURA_DENUNCIADO',
        filename: `${id}_CEDULA_DENUNCIADO_${Date.now()}.pdf`,
        // template: 'CEDULA_APERTURA_DENUNCIADO.docx',
      };

      // const denunciadoFile = await this.templateService.createDocx(
      //   {
      //     ...info,
      //     denunciado: denunciado.denunciado.nombre,
      //     email_denunciado: denunciado.denunciado.email,
      //   },
      //   denunciadosFiles.template,
      // );
      const denunciadoFile = await generatePDF(
        {
          ...info,
          denunciado: denunciado.denunciado.nombre,
          email_denunciado: denunciado.denunciado.email,
        },
        'denunciado',
      );

      documentFiles.push({
        file: denunciadoFile,
        filename: denunciadosFiles.filename,
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
          message: `Documentos de la denuncia Expte: Nº ${nro_expediente}`,
        },
        files: documentFiles.map((e) => e.filename),
      },
      // {
      //   email: 'braian.silva97@gmail.com',
      //   bodyEmail: {
      //     message: `Documentos de la denuncia Expte: Nº ${nro_expediente}`,
      //   },
      //   files: documentFiles.map((e) => e.filename),
      // },
    ];

    form.append('method', 'denuncia_omic');
    form.append('data', JSON.stringify({ data: dataNot }));
    form.append('hasFiles', 'true');

    documentFiles.forEach((e) => {
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

    await this.movimientoService.create({
      denuncia,
      tabla_afectada: 'Denuncia_Estados',
      entidad_id: denunciaEstado.denunciaEstadosId,
      tipo_cambio: 'CREATE',
      descripcion: 'Aprobar denuncia.',
      valor_nuevo: estado.descripcion,
      usuarioId: userId,
    });

    await this.causasService.create({
      anioCausa: new Date().getFullYear(),
      denunciaId: denuncia.id,
    });

    denuncia.ultMovimiento = new Date();
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

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!denuncia) {
      throw new NotFoundException();
    }
    const estado = await this.estadosService.findByKey('RECHAZADO');
    this.denunciaRepo.merge(denuncia, { estado });

    const denunciaEstado = await this.denunciaEstadosService.create({
      denunciaId: id,
      estadoId: estado.id,
      motivo,
      usuarioId: userId,
    });

    this.datosNotificacionService.create({
      ...data,
      denuncia,
      denunciaEstado: denunciaEstado,
    });

    if (enviar_mail) {
      const dataNot = {
        method: 'denuncia_rechazada',
        data: [
          {
            email: denunciante_email,
            bodyEmail: {
              message: `Su denuncia contra ${`${denuncia.denunciadoDenuncia[0].denunciado.nombre}`} fue:`,
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

    await this.movimientoService.create({
      denuncia,
      tabla_afectada: 'Denuncia_Estados',
      entidad_id: denunciaEstado.denunciaEstadosId,
      tipo_cambio: 'CREATE',
      descripcion: 'Rechazar denuncia.',
      valor_nuevo: estado.descripcion,
      usuarioId: userId,
    });

    denuncia.ultMovimiento = new Date();
    await this.denunciaRepo.save(denuncia);

    return this.denunciaRepo.save(denuncia);
  }

  async revert(data) {
    const { id, userId } = data;

    const relations = ['denunciante', 'denunciaDocumentos'];

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!denuncia) {
      throw new NotFoundException();
    }

    await this.ftpService.connect();
    for (const e of denuncia.denunciaDocumentos) {
      await this.ftpService.remove(e.path);
      await this.denunciaDocumentosService.delete(e);
    }
    this.ftpService.close();

    const estado = await this.estadosService.findByKey('RECIBIDA');
    // this.denunciaRepo.merge(denuncia, { estado });

    const nuevoEstado = await this.denunciaEstadosService.create({
      denunciaId: id,
      estadoId: estado.id,
      usuarioId: userId,
    });

    await this.movimientoService.create({
      denuncia,
      tabla_afectada: 'Denuncia_Estados',
      entidad_id: nuevoEstado.denunciaEstadosId,
      tipo_cambio: 'CREATE',
      descripcion: 'Revertir estado de la denuncia.',
      valor_nuevo: estado.descripcion,
      usuarioId: userId,
    });

    denuncia.ultMovimiento = new Date();
    denuncia.estado = estado;

    return this.denunciaRepo.save(denuncia);
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

      envio_tipo,
    } = data;

    const relations = [
      'denunciante',
      'archivos',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
    ];

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

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
      denunciados: denuncia.denunciadoDenuncia.map((e) => {
        return {
          ...e.denunciado,
          dni: e.denunciado.dniCuilCuit,
          codpostal: e.denunciado.codPostal,
          tel: e.denunciado.telefono,
          telalt: e.denunciado.telefonoAlter,
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

    if (envio_tipo === 'email' || envio_tipo === 'ambos') {
      this.getArchivosAdjuntos(denuncia)
        .then(async (archivos) => {
          for (const denunciado of denunciados) {
            await this.procesarDenunciado({
              denunciado,
              info,
              files,
              archivos,
              id,
              denuncia,
              enviarMails: true,
            });
          }
        })
        .then(() => {
          return this.ftpService.close();
        });
    } else {
      for (const denunciado of denunciados) {
        await this.procesarDenunciado({
          denunciado,
          info,
          files,
          id,
          denuncia,
          enviarMails: false,
        });
      }
    }

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
    denunciado,
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
      denunciado: denunciado ? denunciado : this.formatDenunciados(denuncia),
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

  private async procesarDenunciado({
    denunciado,
    info,
    files,
    archivos,
    id,
    denuncia,
    enviarMails,
  }: {
    denunciado: any;
    info: any;
    files: any;
    archivos?: any;
    id: any;
    denuncia: any;
    enviarMails: boolean;
  }) {
    console.log('procesarDenunciado');

    const denunciadosFiles = {
      message: 'La denuncia en su contra fue',
      key: 'CEDULA_APERTURA_DENUNCIADO',
      filename: `${id}_CEDULA_DENUNCIADO_${Date.now()}.pdf`,
      // template: 'CEDULA_APERTURA_DENUNCIADO.docx',
    };
    try {
      // const file = await this.templateService.createDocx(
      //   {
      //     ...info,
      //     denunciado: denunciado.nombre,
      //     email_denunciado: denunciado.email,
      //   },
      //   denunciadosFiles.template,
      // );

      const file = await generatePDF(
        {
          ...info,
          denunciado: denunciado.nombre,
          email_denunciado: denunciado.email,
        },
        'denunciado',
      );

      await this.uploadFileToFTP(file, id, denunciadosFiles.filename);
      await this.saveDocumentRecord(
        denuncia.id,
        denunciadosFiles.key,
        denunciadosFiles.filename,
        `${this._dir}/${id}/${denunciadosFiles.filename}`,
      );

      if (denunciado.email && enviarMails) {
        console.log('denunciado.email', denunciado.email);
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
        files: [...files.map((f) => f.filename), denunciadosFiles.filename],
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
      envio_tipo,
      postales,
      emails,
      // enviar_mail,
    } = data;

    const relations = [
      'archivos',
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
    ];

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

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

    const datosNotificacion = await this.datosNotificacionService.create({
      ...data,
      denuncia,
    });

    await this.denunciadoDenunciaService.create({
      denuncia,
      denunciado,
    });

    for (const e of emails) {
      await this.direccionesEnviadasService.create({
        datosNotificacionId: datosNotificacion.id,
        denunciadoId: denunciado.id,
        email: e.email,
        // codPostal: denunciado.codPostal,
      });
    }

    for (const e of postales) {
      await this.direccionesEnviadasService.create({
        datosNotificacionId: datosNotificacion.id,
        denunciadoId: denunciado.id,
        // email: denunciado.email,
        codPostal: e.codPostal,
      });
    }

    const fechaActual = this.getFechaActual();
    const fechaReunion = this.parseFechaReunion(date_link);

    const denunciados = emails.map((e) => {
      return {
        ...denunciado,
        email: e.email,
      };
    });

    const info = this.buildInfo(
      denuncia,
      nombre,
      fechaActual,
      fechaReunion,
      meet_link,
      time_link,
      denuncia.denunciante.email,
      denuncia.nroExpediente,
    );

    const denunciaData = {
      ...denuncia,
      denunciados: denuncia.denunciadoDenuncia.map((e) => {
        return {
          ...e.denunciado,
          dni: e.denunciado.dniCuilCuit,
          codpostal: e.denunciado.codPostal,
          tel: e.denunciado.telefono,
          telalt: e.denunciado.telefonoAlter,
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

    if (envio_tipo === 'email' || envio_tipo === 'ambos') {
      this.getArchivosAdjuntos(denuncia)
        .then(async (archivos) => {
          for (const denunciado of denunciados) {
            await this.procesarDenunciado({
              denunciado,
              info,
              files,
              archivos,
              id,
              denuncia,
              enviarMails: true,
            });
          }
        })
        .then(() => {
          return this.ftpService.close();
        });
    } else {
      for (const denunciado of denunciados) {
        await this.procesarDenunciado({
          denunciado,
          info,
          files,
          id,
          denuncia,
          enviarMails: false,
        });
      }
    }

    await this.movimientoService.create({
      denuncia,
      tabla_afectada: 'Denunciado',
      entidad_id: denunciado.id,
      tipo_cambio: 'CREATE',
      descripcion: 'Denunciado agregado.',
      valor_nuevo: nombre,
      usuarioId: userId,
    });
    denuncia.ultMovimiento = new Date();
    await this.denunciaRepo.save(denuncia);

    return denunciado;
  }

  async adjuntarDocumentacion(data, file) {
    const { id, name, userId } = data;

    const denuncia = await this.getDenuncia(id);

    if (!denuncia) {
      throw new NotFoundException();
    }

    const ruta = `${this._dir}/${id}`;
    const stream = Readable.from(file.buffer);
    const remotePath = ruta + `/${file.originalname}`;

    this.ftpService.fileUpload(stream, remotePath);

    const documentoTipo = await this.documentosTiposService.findByKey(
      'DOCUMENTO_AGREGADO',
    );

    const document = await this.denunciaDocumentosService.create({
      denunciaId: denuncia.id,
      documentoTipoId: documentoTipo.id,
      fileName: file.originalname,
      path: remotePath,
      documentName: name,
    });

    await this.movimientoService.create({
      denuncia,
      tabla_afectada: 'Denuncia_Documentos',
      entidad_id: document.denunciaDocumentosId,
      tipo_cambio: 'CREATE',
      descripcion: 'Documento agregado.',
      valor_nuevo: `${documentoTipo.descripcion} - ${file.originalname}`,
      usuarioId: userId,
    });
    denuncia.ultMovimiento = new Date();
    await this.denunciaRepo.save(denuncia);

    return {
      ok: true,
    };
  }

  async denunciaArchivos(id: number) {
    const relations = ['archivos'];
    const complaint = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });
    if (!complaint) {
      throw new NotFoundException();
    }
    return complaint;
  }

  async denunciaDocumentos(id: number) {
    const relations = [
      'denunciaDocumentos',
      'denunciaDocumentos.documentoTipo',
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

  async findAll({ estado }) {
    const where: FindOptionsWhere<Denuncia> = {};

    if (estado) {
      where.estado = Equal(estado);
    }
    const relations = ['estado'];

    return this.denunciaRepo.find({ where, relations });
  }

  async cargarMovimientos() {
    const relations = ['estado'];

    const denuncias = await this.denunciaRepo.find({ relations });

    const promises = denuncias.map(async (denuncia) => {
      const denunciaEstado = await this.denunciaEstadosService.lastState({
        denunciaId: denuncia.id,
        estadoId: denuncia.estado.id,
      });

      if (denunciaEstado) {
        const exist = await this.movimientoService.findOne({ denuncia });
        if (!exist) {
          await this.movimientoService.create({
            denuncia,
            tabla_afectada: 'Denuncia_Estados',
            entidad_id: denunciaEstado?.denunciaEstadosId,
            tipo_cambio: 'CREATE',
            descripcion: 'Aprobar denuncia.',
            valor_nuevo: denuncia.estado.descripcion,
            createAt: denunciaEstado.createAt,
          });

          denuncia.ultMovimiento = new Date();
          return await this.denunciaRepo.save(denuncia);
        } else {
          return;
        }
      } else {
        if (denuncia.fecha) {
          denuncia.ultMovimiento = denuncia.fecha;
          return await this.denunciaRepo.save(denuncia);
        } else {
          return;
        }
      }
    });

    return await Promise.all(promises);
  }

  async changeState(data, file) {
    let parsedPayload;
    try {
      parsedPayload =
        typeof data.payload === 'string' ? JSON.parse(data.payload) : data;
    } catch (error) {
      console.error('❌ Error al parsear payload:', error);
      throw new Error('Formato de payload inválido.');
    }

    const {
      id,
      estadoId,
      userId,
      denunciante,
      nroExpediente,
      tipoEnvio,
      tipoCorreo,
      denunciados,
      postales,
    } = parsedPayload;

    const relations = ['denunciante', 'denunciaDocumentos'];

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!denuncia) {
      console.error('❌ Denuncia no encontrada:', id);
      throw new NotFoundException();
    }
    const estado = await this.estadosService.findOne(estadoId);

    const nuevoEstado = await this.denunciaEstadosService.create({
      denunciaId: id,
      estadoId,
      usuarioId: userId,
    });

    await this.movimientoService.create({
      denuncia,
      tabla_afectada: 'Denuncia_Estados',
      entidad_id: nuevoEstado.denunciaEstadosId,
      tipo_cambio: 'CREATE',
      descripcion: `Cambio de estado a ${estado.descripcion}.`,
      valor_nuevo: estado.descripcion,
      usuarioId: userId,
    });

    if (tipoCorreo) {
      if (tipoEnvio === 'email') {
        const form = new FormData();
        const emailsToSend = [];
        const message =
          tipoCorreo === 'A'
            ? 'Buenos días estimados, adjunto envío el acta de la audiencia celebrada en el marco del expediente de la referencia.'
            : 'Buenos días estimados, adjunto envío Resolución de esta oficina en el marco del expediente de la referencia.';

        await this.ftpService.connect();
        const ruta = `${this._dir}/${id}`;
        await this.ftpService.createDir(ruta);

        const fileName = `${id}_cambio_estado_${estadoId}_${Date.now()}.pdf`;
        const remotePath = `${ruta}/${fileName}`;

        const streamFile = Readable.from(file.buffer);
        await this.ftpService.fileUpload(streamFile, remotePath);
        this.ftpService.close();

        const documentoTipo = await this.documentosTiposService.findByKey(
          'DOCUMENTO_NOTIFICACION',
        );

        console.log('🔍 Id de denuncia', id);

        const response = await this.denunciaDocumentosService.create({
          denunciaId: id,
          documentoTipoId: documentoTipo.id,
          fileName,
          path: remotePath,
        });

        console.log('🔍 Id de documento', response);

        if (denunciante.email) {
          emailsToSend.push({
            email: denunciante.email,
            bodyEmail: {
              message: message,
              expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
            },
            files: [fileName],
          });
        }

        denunciados.forEach((denunciado) => {
          if (denunciado.email) {
            emailsToSend.push({
              email: denunciado.email,
              bodyEmail: {
                message: message,
                expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
              },
              files: [fileName],
            });
          }
        });

        form.append('method', 'denuncia_cambio_estado');
        form.append('data', JSON.stringify({ data: emailsToSend }));
        form.append('hasFiles', 'true');
        form.append(fileName, file.buffer, { filename: fileName });

        try {
          const response = await axios.post(
            'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications',
            form,
            {
              headers: {
                'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
              },
            },
          );

          console.log('✅ Emails enviados correctamente:', response.data);
        } catch (error) {
          console.error(
            '❌ Error enviando emails:',
            error.response?.data || error.message,
          );
        }

        const datosNotificacion = await this.datosNotificacionService.create({
          ...data,
          denuncia,
          denunciaEstado: nuevoEstado,
          id_usuario: userId,
          envio_tipo: tipoEnvio,
          documentPath: remotePath,
        });

        await this.direccionesEnviadasService.create({
          datosNotificacionId: datosNotificacion.id,
          denuncianteId: denuncia.denunciante.id,
          email: denunciante.email,
        });

        await Promise.all(
          postales.map(async (denunciado) => {
            return this.direccionesEnviadasService.create({
              datosNotificacionId: datosNotificacion.id,
              denunciadoId: denunciado.id,
              email: denunciado.email,
            });
          }),
        );
      } else if (tipoEnvio === 'postal') {
        const datosNotificacion = await this.datosNotificacionService.create({
          ...data,
          denuncia,
          denunciaEstado: nuevoEstado,
          id_usuario: userId,
          envio_tipo: tipoEnvio,
        });

        await this.direccionesEnviadasService.create({
          datosNotificacionId: datosNotificacion.id,
          denuncianteId: denuncia.denunciante.id,
          email: null,
          codPostal: denunciante.codPostal,
        });

        await Promise.all(
          postales.map(async (denunciado) => {
            return this.direccionesEnviadasService.create({
              datosNotificacionId: datosNotificacion.id,
              denunciadoId: denunciado.id,
              codPostal: denunciado.codPostal,
            });
          }),
        );
      } else if (tipoEnvio === 'ambos') {
        const form = new FormData();
        const emailsToSend = [];
        const message =
          tipoCorreo === 'A'
            ? 'Buenos días estimados, adjunto envío el acta de la audiencia celebrada en el marco del expediente de la referencia.'
            : 'Buenos días estimados, adjunto envío Resolución de esta oficina en el marco del expediente de la referencia.';

        await this.ftpService.connect();
        const ruta = `${this._dir}/${id}`;
        await this.ftpService.createDir(ruta);

        const fileName = `${id}_cambio_estado_${estadoId}_${Date.now()}.pdf`;
        const remotePath = `${ruta}/${fileName}`;

        const streamFile = Readable.from(file.buffer);
        await this.ftpService.fileUpload(streamFile, remotePath);
        this.ftpService.close();

        const documentoTipo = await this.documentosTiposService.findByKey(
          'DOCUMENTO_NOTIFICACION',
        );

        await this.denunciaDocumentosService.create({
          denunciaId: id,
          documentoTipoId: documentoTipo.id,
          fileName,
          path: remotePath,
        });

        if (denunciante.email) {
          emailsToSend.push({
            email: denunciante.email,
            bodyEmail: {
              message: message,
              expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
            },
            files: [fileName],
          });
        }

        denunciados.forEach((denunciado) => {
          if (denunciado.email) {
            emailsToSend.push({
              email: denunciado.email,
              bodyEmail: {
                message: message,
                expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
              },
              files: [fileName],
            });
          }
        });

        console.log(
          '📨 Enviando correos a:',
          emailsToSend.map((e) => e.email),
        );

        form.append('method', 'denuncia_cambio_estado');
        form.append('data', JSON.stringify({ data: emailsToSend }));
        form.append('hasFiles', 'true');
        form.append(fileName, file.buffer, { filename: fileName });

        try {
          const response = await axios.post(
            'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications',
            form,
            {
              headers: {
                'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
              },
            },
          );

          console.log('✅ Emails enviados correctamente:', response.data);
        } catch (error) {
          console.error(
            '❌ Error enviando emails:',
            error.response?.data || error.message,
          );
        }

        const datosNotificacion = await this.datosNotificacionService.create({
          ...data,
          denuncia,
          denunciaEstado: nuevoEstado,
          id_usuario: userId,
          envio_tipo: tipoEnvio,
          documentPath: remotePath,
        });

        await this.direccionesEnviadasService.create({
          datosNotificacionId: datosNotificacion.id,
          denuncianteId: denuncia.denunciante.id,
          email: denunciante.email,
          codPostal: denunciante.codPostal,
        });

        await Promise.all(
          postales.map(async (denunciado) => {
            return this.direccionesEnviadasService.create({
              datosNotificacionId: datosNotificacion.id,
              denunciadoId: denunciado.id,
              codPostal: denunciado.codPostal,
              email: denunciado.email,
            });
          }),
        );
      }
    } else {
      await this.datosNotificacionService.create({
        ...data,
        denuncia,
        denunciaEstado: nuevoEstado,
        id_usuario: userId,
      });
    }

    denuncia.estado = estado;
    denuncia.ultMovimiento = new Date();

    const updatedDenuncia = await this.denunciaRepo.save(denuncia);

    return updatedDenuncia;
  }
}
