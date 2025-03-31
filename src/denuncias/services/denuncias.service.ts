import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
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
import { Readable, Stream } from 'stream';
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
  private _dir = process.env.FTP_FOLDER || '/images/omic-admin-dev/causas';
  private _dirRechazadas =
    process.env.FTP_FOLDER_RECHAZADAS || '/images/omic-admin-dev/rechazadas';
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
          const fechaInicio = new Date(ultMovimiento);
          fechaInicio.setUTCHours(0, 0, 0, 0);

          const fechaFin = new Date(ultMovimiento);
          fechaFin.setUTCHours(23, 59, 59, 999);

          where.ultMovimiento = Between(fechaInicio, fechaFin);
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
    envio_tipo,
  }) {
    const dia = new Date().getDate();
    const mes = new Date().toLocaleString('es-AR', { month: 'long' });
    const año = new Date().getFullYear();
    const [year_meet, month_meet, day_meet] = date_link.split('-');
    const weekday_meet = WeekDays[new Date(date_link).getDay()];

    const month_meet_number = parseInt(month_meet, 10);
    const month_meet_string = month_meet_number.toString();

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
      envio_tipo,
      link_meet: meet_link,
      year_meet,
      month_meet: Months[month_meet_string],
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

    await this.ftpService.connect();

    try {
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
        throw new NotFoundException('Denuncia no encontrada');
      }

      const archivos = await this.getArchivosAdjuntos(denuncia);

      const estado = await this.estadosService.findByKey('ESPERA_AUDIENCIA');
      this.denunciaRepo.merge(denuncia, { estado });

      const denunciaEstado = await this.denunciaEstadosService.create({
        denunciaId: id,
        estadoId: estado.id,
        usuarioId: userId,
      });

      const datosNotificacion = await this.datosNotificacionService.create({
        ...data,
        denuncia,
        denunciaEstado,
        id_usuario: userId,
      });

      const registerAddress = async (persona, tipo, esDenunciante = false) => {
        const payload = {
          datosNotificacionId: datosNotificacion.id,
          ...(esDenunciante
            ? { denuncianteId: persona.id }
            : { denunciadoId: persona.id }),
        };

        if (esDenunciante && tipo === 'ambos') {
          await this.direccionesEnviadasService.create({
            ...payload,
            email: persona.email,
            codPostal: persona.codPostal,
          });
        } else {
          if (tipo === 'email' || tipo === 'ambos') {
            await this.direccionesEnviadasService.create({
              ...payload,
              email: persona.email,
            });
          }

          if (tipo === 'postal' || tipo === 'ambos') {
            await this.direccionesEnviadasService.create({
              ...payload,
              codPostal: persona.codPostal,
            });
          }
        }
      };

      await registerAddress(
        {
          id: denuncia.denunciante.id,
          email: denunciante_email,
          codPostal: denunciante_postal,
        },
        envio_tipo,
        true,
      );

      if (envio_tipo === 'email' || envio_tipo === 'ambos') {
        if (denunciados && denunciados.length > 0) {
          for (const denunciado of denunciados) {
            await registerAddress(denunciado, envio_tipo);
          }
        }
      }
      if (envio_tipo === 'postal' || envio_tipo === 'ambos') {
        if (postales && postales.length > 0) {
          for (const postal of postales) {
            await registerAddress(postal, envio_tipo);
          }
        }
      }

      const info = this.dtoInfo({
        denuncia,
        nro_expediente,
        denunciante_email,
        meet_link,
        time_link,
        date_link,
        envio_tipo,
      });

      const ruta = `${this._dir}/${id}`;
      await this.ftpService.createDir(ruta);

      const generateAndSaveDocument = async (key, filename, template) => {
        const infoCorregido = {
          ...info,
          denunciado: String(
            denunciados[0]?.nombre || postales[0]?.nombre || '',
          ),
          email_denunciado: String(
            denunciados[0]?.email || postales[0]?.email || '',
          ),
          direccion_denunciado: String(
            postales[0]?.domicilio || denunciados[0]?.domicilio || '',
          ),
        };
        const content = (await this.templateService.createDocx(
          infoCorregido,
          template,
        )) as Buffer;
        const streamFile = Readable.from(content);
        const remotePath = `${ruta}/${filename}`;
        await this.ftpService.fileUpload(streamFile, remotePath);

        const documentoTipo = await this.documentosTiposService.findByKey(key);
        await this.denunciaDocumentosService.create({
          denunciaId: denuncia.id,
          documentoTipoId: documentoTipo.id,
          fileName: filename,
          path: remotePath,
        });

        return { filename, content };
      };

      // 📄 Generar documentos requeridos usando la función modular
      const caratula = await generateAndSaveDocument(
        'CARATULA',
        `${id}_CARATULA.docx`,
        'CARATULA.docx',
      );
      const apertura = await generateAndSaveDocument(
        'APERTURA_INSTANCIA',
        `${id}_APERTURA_INSTANCIA.docx`,
        'APERTURA_DE_INSTANCIA.docx',
      );

      // 📄 Generar PDF para el denunciante
      const denunciantePDF = await generatePDF(info, 'denunciante');
      const denuncianteFile = {
        key: 'CEDULA_APERTURA_DENUNCIANTE',
        filename: `${id}_CEDULA_DENUNCIANTE.pdf`,
        message: `Su denuncia contra ${info.denunciado} fue`,
        file: denunciantePDF,
      };

      // 📂 Subir PDF del denunciante al FTP
      const remotePathDenunciante = `${ruta}/${denuncianteFile.filename}`;
      await this.ftpService.fileUpload(
        Readable.from(denunciantePDF),
        remotePathDenunciante,
      );

      const documentoTipoDenunciante =
        await this.documentosTiposService.findByKey(denuncianteFile.key);
      await this.denunciaDocumentosService.create({
        denunciaId: denuncia.id,
        documentoTipoId: documentoTipoDenunciante.id,
        fileName: denuncianteFile.filename,
        path: remotePathDenunciante,
      });

      // 📄 Generar PDFs para cada denunciado
      const denunciadosFiles = [];

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

      const filenameDenuncia = `${id}_DENUNCIA.docx`;
      const remotePathDenuncia = `${ruta}/${filenameDenuncia}`;

      if (!denunciaFile || !(denunciaFile instanceof Buffer)) {
        throw new Error('🚨 Error: No se pudo generar el archivo de denuncia.');
      }

      await this.ftpService.fileUpload(
        Readable.from(denunciaFile),
        remotePathDenuncia,
      );

      denunciadosFiles.push({
        filename: filenameDenuncia,
        file: denunciaFile,
      });

      const documentoTipoDenuncia = await this.documentosTiposService.findByKey(
        'DOCUMENTO_AGREGADO',
      );
      await this.denunciaDocumentosService.create({
        denunciaId: denuncia.id,
        documentoTipoId: documentoTipoDenuncia.id,
        fileName: filenameDenuncia,
        path: remotePathDenuncia,
      });

      const fusionarDenunciadosYPostales = (
        denunciados: any[],
        postales: any[],
      ) => {
        const mapa = new Map();

        denunciados.forEach((denunciado) => {
          mapa.set(denunciado.id, {
            ...denunciado,
            tipoEnvioArray: 'email',
          });
        });

        postales.forEach((postal) => {
          if (mapa.has(postal.id)) {
            const existente = mapa.get(postal.id);
            mapa.set(postal.id, {
              ...existente,
              codPostal: postal.codPostal,
              tipoEnvioArray: 'ambos',
            });
          } else {
            mapa.set(postal.id, { ...postal, tipoEnvioArray: 'postal' });
          }
        });

        return Array.from(mapa.values());
      };

      const listaDenunciados = fusionarDenunciadosYPostales(
        denunciados,
        postales,
      );

      console.log('listaDenunciados', listaDenunciados);

      for (const denunciado of listaDenunciados) {
        const postalDenunciado = postales.find((p) => p.id === denunciado.id);
        const denunciadoPDF = await generatePDF(
          {
            ...info,
            denunciado: denunciado.nombre,
            email_denunciado:
              denunciado.tipoEnvioArray === 'email' ||
              denunciado.tipoEnvioArray === 'ambos'
                ? denunciado.email
                : 'No disponible',
            direccion_denunciado:
              denunciado.tipoEnvioArray === 'postal' ||
              denunciado.tipoEnvioArray === 'ambos'
                ? `${postalDenunciado.codPostal} ${postalDenunciado.localidad}`
                : 'No disponible',
            envio_tipo: envio_tipo,
          },
          'denunciado',
        );

        const filename = `${id}_CEDULA_DENUNCIADO_${denunciado.id}.pdf`;
        const remotePathDenunciado = `${ruta}/${filename}`;
        await this.ftpService.fileUpload(
          Readable.from(denunciadoPDF),
          remotePathDenunciado,
        );

        denunciadosFiles.push({
          idDenunciado: denunciado.id,
          filename,
          file: denunciadoPDF,
        });

        const documentoTipoDenunciado =
          await this.documentosTiposService.findByKey(
            'CEDULA_APERTURA_DENUNCIADO',
          );
        await this.denunciaDocumentosService.create({
          denunciaId: denuncia.id,
          documentoTipoId: documentoTipoDenunciado.id,
          fileName: filename,
          path: remotePathDenunciado,
        });
      }

      const denuncianteFiles = [
        {
          filename: denuncianteFile.filename,
          file: denunciantePDF,
        },
      ];

      const emailsEnviados = [];

      // 📩 Enviar correos electrónicos con documentos adjuntos
      const sendEmail = async (
        email,
        message,
        files,
        id?: number,
        key?: string,
      ) => {
        if (!email)
          return console.log(
            '⚠ No se enviará el email por falta de dirección.',
          );

        function formatFechaHora(fecha) {
          const opciones = {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          };

          const fechaArg = fecha.toLocaleString('es-AR', opciones);

          return fechaArg.replace(',', ' a las');
        }

        const form = new FormData();
        const dataNot = [
          {
            subject: `EXPEDIENTE: ${nro_expediente}/${denuncia.denunciante.apellido
              .charAt(0)
              .toUpperCase()}/${new Date().getFullYear()}/${
              denuncia.denunciante.nombre.toUpperCase() +
              ' ' +
              denuncia.denunciante.apellido.toUpperCase()
            } C/ ${denuncia.denunciadoDenuncia[0].denunciado.nombre.toUpperCase()} S/ PRESUNTA INFRACCIÓN A LA LEY 24.240`,
            email,
            cc: 'omicsannicolas@sannicolas.gob.ar',
            bodyEmail: { message },
            files: files.map((f) => f.filename),
          },
        ];
        form.append('method', 'denuncia_aprobada');
        form.append(
          'data',
          JSON.stringify({
            data: dataNot,
          }),
        );
        form.append('hasFiles', 'true');

        files.forEach((file) => {
          if (!file.file) {
            console.error(
              `⚠ Error: El archivo ${file.filename} está vacío o indefinido.`,
            );
            return;
          }
          form.append(file.filename, file.file, { filename: file.filename });
        });

        try {
          const response = await axios.post(
            'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications/notifications-email',
            form,
            {
              headers: {
                'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
              },
            },
          );
          if (email !== 'omicsannicolas@sannicolas.gob.ar') {
            emailsEnviados.push({
              id,
              key,
              email,
              message:
                message === 'La denuncia en su contra fue' ||
                message === denuncianteFile.message
                  ? `${message}: Aprobada`
                  : message,
              fechaHora: formatFechaHora(new Date()),
              documentos: files.map((f) => {
                const sizeInBytes = f.file.length;
                let weight: string;

                if (sizeInBytes < 1024) {
                  weight = `${sizeInBytes} B`;
                } else if (sizeInBytes < 1024 * 1024) {
                  weight = `${(sizeInBytes / 1024).toFixed(2)} KB`;
                } else {
                  weight = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
                }

                return {
                  name: f.filename,
                  weight,
                };
              }),
            });
          }

          console.log(`✉️ Email enviado a ${email}:`, response.data);
        } catch (error) {
          console.error(
            `🚨 Error al enviar el email a ${email}:`,
            error.response?.data || error.message,
          );
        }
      };

      // 📩 Enviar email al denunciante
      if (
        denunciante_email &&
        (envio_tipo === 'email' || envio_tipo === 'ambos')
      ) {
        await sendEmail(
          denunciante_email,
          denuncianteFile.message,
          denuncianteFiles,
          7,
          'COMPROBANTE_NOTIFICACION_DENUNCIANTE',
        );
      }

      // 📩 Enviar email a cada denunciado
      for (const archivo of archivos) {
        denunciadosFiles.push({
          filename: archivo.filename,
          file: archivo.buffer,
        });
      }

      if (envio_tipo === 'email' || envio_tipo === 'ambos') {
        for (const denunciado of denunciados) {
          const denunciadoFilesFiltered = denunciadosFiles.filter(
            (f) => f.idDenunciado === denunciado.id || !f.idDenunciado,
          );

          await sendEmail(
            denunciado.email,
            'La denuncia en su contra fue',
            denunciadoFilesFiltered,
            8,
            'COMPROBANTE_NOTIFICACION_DENUNCIADO',
          );
        }
      }

      const omicFiles = [
        {
          filename: caratula.filename,
          file: caratula.content,
        },
        {
          filename: apertura.filename,
          file: apertura.content,
        },
        ...denunciadosFiles,
        ...denuncianteFiles,
      ];

      // 📩 Notificar a la oficina de OMC
      await sendEmail(
        'omicsannicolas@sannicolas.gob.ar',
        `Documentos de la denuncia Expte: Nº ${info.nro_expediente}`,
        omicFiles,
      );

      console.log('📄 Documentos generados y enviados correctamente.');
      console.log('📧 Correos electrónicos enviados correctamente.');

      for (const email of emailsEnviados) {
        console.log(
          `📧 Email enviado a ${email.email} (${email.fechaHora}):`,
          email.message,
          email.key,
        );
        const pdf = await generatePDF(email, 'notificacion');
        const filename = `${email.key}_${
          email.email.split('@')[0]
        }_APROBADO.pdf`;
        const remotePath = `${ruta}/${filename}`;
        await this.ftpService.fileUpload(Readable.from(pdf), remotePath);

        await this.denunciaDocumentosService.create({
          denunciaId: denuncia.id,
          documentoTipoId: email.id,
          fileName: filename,
          path: remotePath,
        });
      }

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
    } finally {
      this.ftpService.close();
    }
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

    const emailEnviados = [];

    if (enviar_mail) {
      const dataNot = {
        method: 'denuncia_rechazada',
        data: [
          {
            subject: `DENUNCIA: ${new Date().getFullYear()}/${
              denuncia.denunciante.nombre.toUpperCase() +
              ' ' +
              denuncia.denunciante.apellido.toUpperCase()
            } C/ ${denuncia.denunciadoDenuncia[0].denunciado.nombre.toUpperCase()} S/ PRESUNTA INFRACCIÓN A LA LEY 24.240`,
            email: denunciante_email,
            bodyEmail: {
              message: `Su denuncia contra ${`${denuncia.denunciadoDenuncia[0].denunciado.nombre}`} fue:`,
              motivo,
            },
          },
        ],
      };

      axios.post(
        'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications/notifications-email',
        dataNot,
        {
          headers: {
            'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
          },
        },
      );

      function formatFechaHora(fecha) {
        const opciones = {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        };

        const fechaArg = fecha.toLocaleString('es-AR', opciones);

        return fechaArg.replace(',', ' a las');
      }

      emailEnviados.push({
        id: 7,
        key: 'COMPROBANTE_NOTIFICACION_DENUNCIANTE',
        email: denunciante_email,
        message: `Su denuncia contra ${`${denuncia.denunciadoDenuncia[0].denunciado.nombre}`} fue: Rechazada`,
        motivo,
        fechaHora: formatFechaHora(new Date()),
      });
    }

    for (const email of emailEnviados) {
      const pdf = await generatePDF(email, 'notificacion');
      const filename = `${email.key}_${
        email.email.split('@')[0]
      }_RECHAZADO.pdf`;
      const remoteDir = `${this._dirRechazadas}/${id}`;
      await this.ftpService.createDir(remoteDir);
      const remotePath = `${remoteDir}/${filename}`;
      await this.ftpService.fileUpload(Readable.from(pdf), remotePath);

      await this.denunciaDocumentosService.create({
        denunciaId: denuncia.id,
        documentoTipoId: email.id,
        fileName: filename,
        path: remotePath,
      });
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

    const relations = ['denunciante', 'denunciaDocumentos', 'estado', 'causa'];

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

    if (denuncia.estado.key === 'ESPERA_AUDIENCIA') {
      const causa = await this.causasService.findCausaByDenunciaId(denuncia.id);
      if (causa) {
        await this.causasService.deleteCausa(causa.nroCausa);
      }
    }

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
    console.log('📥 Descargando archivos desde el FTP...');

    const archivos = [];

    for (const archivo of denuncia.archivos) {
      console.log(`📂 Descargando: ${archivo.descripcion}`);

      try {
        const buffer = await this.ftpService.downloadFileAsBuffer(
          archivo.descripcion,
        );
        const filename = archivo.descripcion.split('/omic/')[1];

        if (!buffer) {
          console.warn(
            `⚠ Advertencia: No se pudo descargar ${filename}, buffer vacío.`,
          );
          continue;
        }

        archivos.push({ ...archivo, buffer, filename });
        console.log(`✅ Descarga completada: ${filename}`);
      } catch (error) {
        console.error(
          `🚨 Error al descargar ${archivo.descripcion}:`,
          error.message,
        );
      }
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
    const denunciadosFiles = {
      message: 'La denuncia en su contra fue',
      key: 'CEDULA_APERTURA_DENUNCIADO',
      filename: `${id}_CEDULA_DENUNCIADO_${Date.now()}.pdf`,
    };
    try {
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
      {
        email: 'omicsannicolas@sannicolas.gob.ar',
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
      'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications/notifications-email',
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
      denuncia: denuncia,
      denunciado: denunciado,
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

    await this.denunciaRepo.update(denuncia.id, { ultMovimiento: new Date() });

    return denunciado;
  }

  async adjuntarDocumentacion(data, file) {
    const { id, name, userId } = data;
    console.log('data', data);
    console.log('file', file);

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

    function formatFechaHora(fecha) {
      const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];

      const dia = fecha.getDate();
      const mes = meses[fecha.getMonth()];
      const año = fecha.getFullYear();

      const horas = fecha.getHours().toString().padStart(2, '0');
      const minutos = fecha.getMinutes().toString().padStart(2, '0');
      const segundos = fecha.getSeconds().toString().padStart(2, '0');

      return `${dia} ${mes} ${año} at ${horas}:${minutos}:${segundos}`;
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

    const emailsEnviados = [];
    const comprobantesNotificacion = [];

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

        const fileName = `${id}_CAMBIO_ESTADO_${estado.key}_${Date.now()}.pdf`;
        const remotePath = `${ruta}/${fileName}`;

        const streamFile = Readable.from(file.buffer);
        await this.ftpService.fileUpload(streamFile, remotePath);
        this.ftpService.close();

        const documentoTipo = await this.documentosTiposService.findByKey(
          'DOCUMENTO_NOTIFICACION',
        );

        if (denunciante.email) {
          emailsToSend.push({
            subject: `EXPEDIENTE: ${nroExpediente}/${denunciante.apellido
              .charAt(0)
              .toUpperCase()}/${new Date().getFullYear()}/${
              denunciante.nombre.toUpperCase() +
              ' ' +
              denunciante.apellido.toUpperCase()
            } C/ ${denuncia.denunciadoDenuncia[0].denunciado.nombre.toUpperCase()} S/ PRESUNTA INFRACCIÓN A LA LEY 24.240`,
            email: denunciante.email,
            bodyEmail: {
              message: message,
              expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
            },
            files: [fileName],
          });

          emailsEnviados.push({
            id: 7,
            key: 'COMPROBANTE_NOTIFICACION_DENUNCIANTE',
            email: denunciante.email,
            expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
            message: message,
            saludos: true,
            documentos: [
              {
                name: fileName,
                weight: (() => {
                  const sizeInBytes = file.buffer.length;
                  if (sizeInBytes < 1024) {
                    return `${sizeInBytes} B`;
                  } else if (sizeInBytes < 1024 * 1024) {
                    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
                  } else {
                    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
                  }
                })(),
              },
            ],
          });
        }

        denunciados.forEach((denunciado) => {
          if (denunciado.email) {
            emailsToSend.push({
              subject: `EXPEDIENTE: ${nroExpediente}/${denunciante.apellido
                .charAt(0)
                .toUpperCase()}/${new Date().getFullYear()}/${
                denunciante.nombre.toUpperCase() +
                ' ' +
                denunciante.apellido.toUpperCase()
              } C/ ${denuncia.denunciadoDenuncia[0].denunciado.nombre.toUpperCase()} S/ PRESUNTA INFRACCIÓN A LA LEY 24.240`,
              email: denunciado.email,
              bodyEmail: {
                message: message,
                expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
              },
              files: [fileName],
            });

            emailsEnviados.push({
              id: 8,
              key: 'COMPROBANTE_NOTIFICACION_DENUNCIADO',
              email: denunciado.email,
              expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
              message: message,
              saludos: true,
              documentos: [
                {
                  name: fileName,
                  weight: (() => {
                    const sizeInBytes = file.buffer.length;
                    if (sizeInBytes < 1024) {
                      return `${sizeInBytes} B`;
                    } else if (sizeInBytes < 1024 * 1024) {
                      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
                    } else {
                      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
                    }
                  })(),
                },
              ],
            });
          }
        });

        form.append('method', 'denuncia_cambio_estado');
        form.append('data', JSON.stringify({ data: emailsToSend }));
        form.append('hasFiles', 'true');
        form.append(fileName, file.buffer, { filename: fileName });

        try {
          const response = await axios.post(
            'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications/notifications-email',
            form,
            {
              headers: {
                'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
              },
            },
          );

          for (const email of emailsEnviados) {
            email.fechaHora = formatFechaHora(new Date());
            const pdf = await generatePDF(email, 'notificacion');
            const filename = `${email.key}_${email.email.split('@')[0]}_${
              estado.key
            }.pdf`;
            const remotePath = `${this._dir}/${id}/${filename}`;
            await this.ftpService.fileUpload(Readable.from(pdf), remotePath);

            comprobantesNotificacion.push({
              filename,
              path: remotePath,
            });

            await this.denunciaDocumentosService.create({
              denunciaId: id,
              documentoTipoId: email.id,
              fileName: filename,
              path: remotePath,
            });
          }

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
          comprobantes_notificacion: comprobantesNotificacion,
        });

        await this.direccionesEnviadasService.create({
          datosNotificacionId: datosNotificacion.id,
          denuncianteId: denuncia.denunciante.id,
          email: denunciante.email,
        });

        Promise.all(
          denunciados.map(async (denunciado) => {
            return this.direccionesEnviadasService.create({
              datosNotificacionId: datosNotificacion.id,
              denunciadoId: denunciado.id,
              email: denunciado.email,
            });
          }),
        );

        this.denunciaDocumentosService.create({
          denunciaId: denuncia.id,
          documentoTipoId: documentoTipo.id,
          fileName,
          path: remotePath,
        });
      } else if (tipoEnvio === 'postal') {
        await this.ftpService.connect();
        const ruta = `${this._dir}/${id}`;
        await this.ftpService.createDir(ruta);

        const fileName = `${id}_cambio_estado_${estadoId}_${Date.now()}.pdf`;
        const remotePath = `${ruta}/${fileName}`;

        const streamFile = Readable.from(file.buffer);
        await this.ftpService.fileUpload(streamFile, remotePath);
        this.ftpService.close();

        const datosNotificacion = await this.datosNotificacionService.create({
          ...data,
          denuncia,
          denunciaEstado: nuevoEstado,
          id_usuario: userId,
          envio_tipo: tipoEnvio,
          documentPath: remotePath,
        });

        const documentoTipo = await this.documentosTiposService.findByKey(
          'DOCUMENTO_NOTIFICACION',
        );

        await this.direccionesEnviadasService.create({
          datosNotificacionId: datosNotificacion.id,
          denuncianteId: denuncia.denunciante.id,
          codPostal: denunciante.codPostal,
        });

        Promise.all(
          postales.map(async (denunciado) => {
            return this.direccionesEnviadasService.create({
              datosNotificacionId: datosNotificacion.id,
              denunciadoId: denunciado.id,
              codPostal: denunciado.codPostal,
            });
          }),
        );

        this.denunciaDocumentosService.create({
          denunciaId: denuncia.id,
          documentoTipoId: documentoTipo.id,
          fileName,
          path: remotePath,
        });
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
            subject: `EXPEDIENTE: ${nroExpediente}/${denunciante.apellido
              .charAt(0)
              .toUpperCase()}/${new Date().getFullYear()}/${
              denunciante.nombre.toUpperCase() +
              ' ' +
              denunciante.apellido.toUpperCase()
            } C/ ${denuncia.denunciadoDenuncia[0].denunciado.nombre.toUpperCase()} S/ PRESUNTA INFRACCIÓN A LA LEY 24.240`,
            email: denunciante.email,
            bodyEmail: {
              message: message,
              expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
            },
            files: [fileName],
          });
          emailsEnviados.push({
            id: 7,
            key: 'COMPROBANTE_NOTIFICACION_DENUNCIANTE',
            email: denunciante.email,
            expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
            message: message,
            saludos: true,
            documentos: [
              {
                name: fileName,
                weight: (() => {
                  const sizeInBytes = file.buffer.length;
                  if (sizeInBytes < 1024) {
                    return `${sizeInBytes} B`;
                  } else if (sizeInBytes < 1024 * 1024) {
                    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
                  } else {
                    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
                  }
                })(),
              },
            ],
          });
        }

        denunciados.forEach((denunciado) => {
          if (denunciado.email) {
            emailsToSend.push({
              subject: `EXPEDIENTE: ${nroExpediente}/${denunciante.apellido
                .charAt(0)
                .toUpperCase()}/${new Date().getFullYear()}/${
                denunciante.nombre.toUpperCase() +
                ' ' +
                denunciante.apellido.toUpperCase()
              } C/ ${denuncia.denunciadoDenuncia[0].denunciado.nombre.toUpperCase()} S/ PRESUNTA INFRACCIÓN A LA LEY 24.240`,
              email: denunciado.email,
              bodyEmail: {
                message: message,
                expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
              },
              files: [fileName],
            });
            emailsEnviados.push({
              id: 8,
              key: 'COMPROBANTE_NOTIFICACION_DENUNCIADO',
              email: denunciado.email,
              expte: `Expte.: ${nroExpediente} Presunta Infracción Ley 24.240`,
              message: message,
              saludos: true,
              documentos: [
                {
                  name: fileName,
                  weight: (() => {
                    const sizeInBytes = file.buffer.length;

                    if (sizeInBytes < 1024) {
                      return `${sizeInBytes} B`;
                    } else if (sizeInBytes < 1024 * 1024) {
                      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
                    } else {
                      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
                    }
                  })(),
                },
              ],
            });
          }
        });

        form.append('method', 'denuncia_cambio_estado');
        form.append('data', JSON.stringify({ data: emailsToSend }));
        form.append('hasFiles', 'true');
        form.append(fileName, file.buffer, { filename: fileName });

        try {
          const response = await axios.post(
            'https://notificaciones-8abd2b855cde.herokuapp.com/api/notifications/notifications-email',
            form,
            {
              headers: {
                'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
              },
            },
          );

          for (const email of emailsEnviados) {
            email.fechaHora = formatFechaHora(new Date());
            const pdf = await generatePDF(email, 'notificacion');
            const filename = `${email.key}_${email.email.split('@')[0]}_${
              estado.key
            }.pdf`;
            const remotePath = `${this._dir}/${id}/${filename}`;
            await this.ftpService.fileUpload(Readable.from(pdf), remotePath);

            comprobantesNotificacion.push({
              filename,
              path: remotePath,
            });

            await this.denunciaDocumentosService.create({
              denunciaId: id,
              documentoTipoId: email.id,
              fileName: filename,
              path: remotePath,
            });
          }

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
          comprobantes_notificacion: comprobantesNotificacion,
        });

        await this.direccionesEnviadasService.create({
          datosNotificacionId: datosNotificacion.id,
          denuncianteId: denuncia.denunciante.id,
          email: denunciante.email,
          codPostal: denunciante.codPostal,
        });

        Promise.all([
          ...postales.map((denunciado) =>
            this.direccionesEnviadasService.create({
              datosNotificacionId: datosNotificacion.id,
              denunciadoId: denunciado.id,
              codPostal: denunciado.codPostal,
            }),
          ),
          ...denunciados.map((denunciado) =>
            this.direccionesEnviadasService.create({
              datosNotificacionId: datosNotificacion.id,
              denunciadoId: denunciado.id,
              email: denunciado.email,
            }),
          ),
        ]);

        this.denunciaDocumentosService.create({
          denunciaId: denuncia.id,
          documentoTipoId: documentoTipo.id,
          fileName,
          path: remotePath,
        });
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
