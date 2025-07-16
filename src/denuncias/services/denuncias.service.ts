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
import { QueueService } from 'src/queue/queue.service';
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
import { DenunciaTasksService } from './denuncia-task.service';
import { FileService } from './file.service';

@Injectable()
export class DenunciasService {
  private _dir = process.env.FTP_FOLDER || '/images/omic-admin-dev/causas';
  private _dirRechazadas =
    process.env.FTP_FOLDER_RECHAZADAS || '/images/omic-admin-dev/rechazadas';
  private readonly startDateDenuncia: string;
  private fusionarDenunciadosYPostales(denunciados: any[], postales: any[]) {
    const mapa = new Map();

    for (const d of denunciados) {
      mapa.set(d.id, { ...d, tipoEnvioArray: 'email' });
    }

    for (const p of postales) {
      if (mapa.has(p.id)) {
        mapa.set(p.id, {
          ...mapa.get(p.id),
          codPostal: p.codPostal,
          localidad: p.localidad,
          tipoEnvioArray: 'ambos',
        });
      } else {
        mapa.set(p.id, { ...p, tipoEnvioArray: 'postal' });
      }
    }

    return Array.from(mapa.values());
  }

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
    private denunciaTasksService: DenunciaTasksService,
    private fileService: FileService,
    @Inject(forwardRef(() => CausasService))
    private causasService: CausasService,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private readonly queueService: QueueService,
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
        'denunciaEstados',
      ];

      if (!params) return this.denunciaRepo.find({ relations });

      const {
        denunciante,
        dni,
        email,
        estado,
        date,
        ultMovimiento,
        orden = 'DESC',
        limit,
        offset,
      } = params;

      const where: FindOptionsWhere<Denuncia> = {};

      if (date) {
        const inicio = new Date(date);
        inicio.setUTCHours(0, 0, 0, 0);
        const fin = new Date(date);
        fin.setUTCHours(23, 59, 59, 999);
        where.fecha = Between(inicio, fin);
      } else if (this.startDateDenuncia) {
        where.fecha = MoreThanOrEqual(
          new Date(this.startDateDenuncia.replaceAll('-', '/')),
        );
      }

      if (ultMovimiento) {
        const inicio = new Date(ultMovimiento);
        inicio.setUTCHours(0, 0, 0, 0);
        const fin = new Date(ultMovimiento);
        fin.setUTCHours(23, 59, 59, 999);
        where.ultMovimiento = Between(inicio, fin);
      }

      if (denunciante) {
        const palabras = denunciante.trim().split(' ');

        const apellidoMatch = palabras.map((p) => ({
          apellido: Like(`%${p}%`),
          ...(dni && { dni: Like(`%${dni}%`) }),
          ...(email && { email: Like(`%${email}%`) }),
        }));

        const nombreMatch = palabras.map((p) => ({
          nombre: Like(`%${p}%`),
          ...(dni && { dni: Like(`%${dni}%`) }),
          ...(email && { email: Like(`%${email}%`) }),
        }));

        where.denunciante = [...apellidoMatch, ...nombreMatch];
      } else if (dni || email) {
        where.denunciante = {
          ...(dni && { dni: Like(`%${dni}%`) }),
          ...(email && { email: Like(`%${email}%`) }),
        };
      }

      where.estado = estado ? Equal(estado) : In([1, 2, 3]);

      const queryOptions = {
        relations,
        where,
        order: { id: orden },
        ...(limit && { take: limit }),
        ...(offset && { skip: offset }),
      };

      return this.denunciaRepo.find(queryOptions);
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
      'datosNotificacion.usuario',
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

  async aprobarDenuncia(data) {
    console.log(
      `📦 [APROBAR] Encolando tarea de aprobación para denuncia #${data.id}`,
    );
    const { id, userId, nro_expediente, envio_tipo, meet_link } = data;

    const relations = [
      'denunciante',
      'denunciadoDenuncia',
      'denunciadoDenuncia.denunciado',
    ];

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations,
    });

    if (!denuncia) throw new NotFoundException('Denuncia no encontrada');

    const estado = await this.estadosService.findByKey('ESPERA_AUDIENCIA');
    this.denunciaRepo.merge(denuncia, { estado });

    const denunciaEstado = await this.denunciaEstadosService.create({
      denunciaId: id,
      estadoId: estado.id,
      usuarioId: userId,
    });

    await this.datosNotificacionService.create({
      denuncia,
      denunciaEstado,
      envio_tipo,
      meet_link,
      id_usuario: userId,
    });

    denuncia.ultMovimiento = new Date();
    denuncia.nroExpediente = nro_expediente;

    await this.movimientoService.create({
      denuncia,
      tabla_afectada: 'Denuncia_Estados',
      entidad_id: denunciaEstado.denunciaEstadosId,
      tipo_cambio: 'CREATE',
      descripcion: 'Aprobación inicial de la denuncia.',
      valor_nuevo: estado.descripcion,
      usuarioId: userId,
    });

    const resDenuncia = this.denunciaRepo.save(denuncia);

    await this.causasService.create({
      anioCausa: new Date().getFullYear(),
      denunciaId: denuncia.id,
    });

    data.estadoId = estado.id;

    const jobId = `subir-documentos-${Date.now()}-${id}`;

    await this.denunciaTasksService.createTask({
      denuncia,
      etapa: 'subir-documentos',
      prioridad: 1,
      jobId,
    });

    await this.queueService.addDenunciaTask(
      'subir-documentos',
      { ...data, jobId },
      {
        jobId,
        priority: 2,
      },
    );

    return resDenuncia;
  }

  async subirArchivo(buffer, filename, denunciaId, ruta) {
    console.log(`📤 [UPLOAD] Encolando subida: ${filename}`);
    return this.queueService.addTask(
      {
        tipo: 'upload',
        file: {
          fileName: filename,
          content: buffer.toString('base64'),
          remotePath: ruta,
        },
      },
      {
        priority: 2,
        jobId: `upload-${denunciaId}-${filename}`,
        removeOnComplete: { age: 120 },
      },
    );
  }

  async saveDocumento(
    filename: string,
    key: string,
    denunciaId: number,
    ruta: string,
  ) {
    const tipo = await this.documentosTiposService.findByKey(key);
    await this.denunciaDocumentosService.create({
      denunciaId: denunciaId,
      documentoTipoId: tipo.id,
      fileName: filename,
      path: `${ruta}/${filename}`,
    });
    console.log(`✅ [DB] Documento registrado en BD: ${filename}`);
  }

  async subirDocumentos(data: any) {
    const {
      id,
      denunciante_email,
      nro_expediente,
      envio_tipo,
      meet_link,
      date_link,
      time_link,
    } = data;

    try {
      console.log(
        `📥 [DOCUMENTOS] Iniciando generación de documentos para Denuncia #${id}`,
      );

      const denuncia = await this.denunciaRepo.findOne({
        where: { id },
        relations: [
          'denunciante',
          'denunciadoDenuncia',
          'denunciadoDenuncia.denunciado',
          'archivos',
        ],
      });

      if (!denuncia) throw new NotFoundException('Denuncia no encontrada');

      const task = await this.denunciaTasksService.findTaskByJobId(data.jobId);

      const ruta = `${this._dir}/${id}`;
      console.log(`📁 [DOCUMENTOS] Creando carpeta en FTP: ${ruta}`);
      await this.queueService.addTask(
        { tipo: 'create-dir', file: { remotePath: ruta } },
        { jobId: `crear-dir-${id}`, priority: 1, removeOnComplete: true },
      );

      const info = this.dtoInfo({
        denuncia,
        nro_expediente,
        denunciante_email,
        meet_link,
        time_link,
        date_link,
        envio_tipo,
      });

      // 📝 Carátula y apertura
      const docs = [
        {
          key: 'CARATULA',
          file: `${id}_CARATULA.docx`,
          template: 'CARATULA.docx',
        },
        {
          key: 'APERTURA_INSTANCIA',
          file: `${id}_APERTURA_INSTANCIA.docx`,
          template: 'APERTURA_DE_INSTANCIA.docx',
        },
      ];

      for (const doc of docs) {
        console.log(`🧾 [DOCX] Generando documento: ${doc.file}`);
        const buffer = await this.templateService.createDocx(
          info,
          doc.template,
        );
        await this.subirArchivo(buffer, doc.file, id, ruta);
        await this.saveDocumento(doc.file, doc.key, id, ruta);
      }

      // 📄 Documento de denuncia
      console.log(`🧾 [DOCX] Generando documento de denuncia`);
      const denunciaData = {
        ...denuncia,
        denunciados: denuncia.denunciadoDenuncia.map((e) => ({
          ...e.denunciado,
          dni: e.denunciado.dniCuilCuit,
          codpostal: e.denunciado.codPostal,
          tel: e.denunciado.telefono,
          telalt: e.denunciado.telefonoAlter,
        })),
      };

      const docDenuncia = await this.templateService.createDocx(
        denunciaData,
        'DENUNCIA.docx',
      );
      const fileDenuncia = `${id}_DENUNCIA.docx`;
      await this.subirArchivo(docDenuncia, fileDenuncia, id, ruta);
      await this.saveDocumento(fileDenuncia, 'DOCUMENTO_AGREGADO', id, ruta);

      // 📩 Generar y subir PDF de denunciante
      const pdfDenunciante = await generatePDF(info, 'denunciante');
      const fileDenunciante = `${id}_CEDULA_DENUNCIANTE.pdf`;
      await this.subirArchivo(pdfDenunciante, fileDenunciante, id, ruta);
      await this.saveDocumento(
        fileDenunciante,
        'CEDULA_APERTURA_DENUNCIANTE',
        id,
        ruta,
      );

      // 📩 Generar y subir PDF de cada denunciado
      const listaDenunciados = this.fusionarDenunciadosYPostales(
        data.denunciados || [],
        data.postales || [],
      );

      for (const d of listaDenunciados) {
        const pdf = await generatePDF(
          {
            ...info,
            denunciado: d.nombre,
            email_denunciado: ['email', 'ambos'].includes(d.tipoEnvioArray)
              ? d.email
              : 'No disponible',
            direccion_denunciado: ['postal', 'ambos'].includes(d.tipoEnvioArray)
              ? `${d.codPostal ?? ''} ${d.localidad ?? ''}`
              : 'No disponible',
            envio_tipo,
          },
          'denunciado',
        );
        const file = `${id}_CEDULA_DENUNCIADO_${d.id}.pdf`;
        await this.subirArchivo(pdf, file, id, ruta);
        await this.saveDocumento(file, 'CEDULA_APERTURA_DENUNCIADO', id, ruta);
      }

      const jobId = `notificar-${Date.now()}-${id}`;

      await this.denunciaTasksService.createTask({
        denuncia,
        etapa: 'notificar-por-correo',
        prioridad: 2,
        jobId,
      });
      console.log(
        `📌 [TASK] Etapa NOTIFICACION encolada para denuncia #${id} con JobID ${jobId}`,
      );

      await this.queueService.addDenunciaTask(
        'notificar-por-correo',
        { ...data, jobId },
        {
          jobId,
          priority: 3,
        },
      );

      if (task) {
        await this.denunciaTasksService.markTaskAsExecuted(task.id);
      }

      return {
        message:
          '📄 Documentos generados, cédulas subidas y tarea marcada como completada.',
      };
    } catch (error) {
      console.error(`❌ [ERROR] ${error.message}`);
      const task = await this.denunciaTasksService.findTaskByJobId(data.jobId);
      if (task) {
        await this.denunciaTasksService.markTaskAsFailed(
          task.id,
          error?.message || 'Error desconocido',
        );
        await this.denunciaEstadosService.markAsFailed(
          id,
          data.estadoId,
          data.userId,
          error?.message || 'Error desconocido',
        );
      }

      throw error;
    }
  }

  async notificarPorCorreo(data) {
    const {
      id,
      denunciante_email,
      denunciante_postal,
      denunciados = [],
      postales = [],
      meet_link,
      date_link,
      time_link,
      userId,
      nro_expediente,
      envio_tipo,
      jobId,
    } = data;

    try {
      const denuncia = await this.denunciaRepo.findOne({
        where: { id },
        relations: [
          'denunciante',
          'denunciadoDenuncia',
          'denunciadoDenuncia.denunciado',
          'archivos',
        ],
      });
      if (!denuncia) throw new NotFoundException('Denuncia no encontrada');

      const task = await this.denunciaTasksService.findTaskByJobId(jobId);
      const datosNotificacion =
        await this.datosNotificacionService.findByDenuncia(id);
      if (!datosNotificacion)
        throw new NotFoundException('Datos de notificación no encontrados');

      const ruta = `${this._dir}/${id}`;
      const info = this.dtoInfo({
        denuncia,
        nro_expediente,
        denunciante_email,
        meet_link,
        time_link,
        date_link,
        envio_tipo,
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
          if (['email', 'ambos'].includes(tipo)) {
            await this.direccionesEnviadasService.create({
              ...payload,
              email: persona.email,
            });
          }
          if (['postal', 'ambos'].includes(tipo)) {
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
      for (const d of denunciados) await registerAddress(d, envio_tipo);
      for (const p of postales) await registerAddress(p, envio_tipo);

      const archivos = await Promise.all(
        denuncia.archivos.map(async (archivo) => {
          const job = await this.queueService.addTask(
            { tipo: 'download', file: { remotePath: archivo.descripcion } },
            {
              jobId: `descarga-${archivo.id}`,
              priority: 4,
              removeOnComplete: true,
            },
          );
          const base64 = await job.waitUntilFinished(
            this.queueService.getQueueEvents(),
          );
          return {
            filename: archivo.descripcion.split('/').pop(),
            file: Buffer.from(base64, 'base64'),
          };
        }),
      );

      const pdfDenunciante = await generatePDF(info, 'denunciante');
      const denuncianteFiles = [
        { filename: `${id}_CEDULA_DENUNCIANTE.pdf`, file: pdfDenunciante },
      ];

      const listaDenunciados = this.fusionarDenunciadosYPostales(
        denunciados,
        postales,
      );
      const denunciadosFiles = [];

      for (const d of listaDenunciados) {
        const pdf = await generatePDF(
          {
            ...info,
            denunciado: d.nombre,
            email_denunciado: ['email', 'ambos'].includes(d.tipoEnvioArray)
              ? d.email
              : 'No disponible',
            direccion_denunciado: ['postal', 'ambos'].includes(d.tipoEnvioArray)
              ? `${d.codPostal ?? ''} ${d.localidad ?? ''}`
              : 'No disponible',
            envio_tipo,
          },
          'denunciado',
        );
        denunciadosFiles.push({
          idDenunciado: d.id,
          filename: `${id}_CEDULA_DENUNCIADO_${d.id}.pdf`,
          file: pdf,
        });
      }

      const docxDenuncia = await this.templateService.createDocx(
        {
          ...denuncia,
          denunciados: denuncia.denunciadoDenuncia.map((e) => ({
            ...e.denunciado,
            dni: e.denunciado.dniCuilCuit,
            codpostal: e.denunciado.codPostal,
            tel: e.denunciado.telefono,
            telalt: e.denunciado.telefonoAlter,
          })),
        },
        'DENUNCIA.docx',
      );

      denunciadosFiles.push({
        filename: `${id}_DENUNCIA.docx`,
        file: docxDenuncia,
      });

      const emailsEnviados = [];

      const denuncianteFile = {
        key: 'CEDULA_APERTURA_DENUNCIANTE',
        filename: `${id}_CEDULA_DENUNCIANTE.pdf`,
        message: `Su denuncia contra ${info.denunciado} fue`,
        file: pdfDenunciante,
      };

      const sendEmail = async (
        email,
        message,
        files,
        idTipoDoc = 7,
        key = '',
      ) => {
        const form = new FormData();
        const subject = `EXPEDIENTE: ${nro_expediente}/${denuncia.denunciante.apellido.toUpperCase()}/${new Date().getFullYear()}/${
          denuncia.denunciante.nombre.toUpperCase() +
          ' ' +
          denuncia.denunciante.apellido.toUpperCase()
        } C/ ${denuncia.denunciadoDenuncia[0].denunciado.nombre.toUpperCase()} S/ PRESUNTA INFRACCIÓN A LA LEY 24.240`;

        console.log(
          `📧 [EMAIL] Enviando correo a ${email} con asunto: ${subject}`,
        );

        const data = [
          {
            subject,
            email,
            cc: 'omicsannicolas@sannicolas.gob.ar',
            bodyEmail: { message },
            files: files.map((f) => f.filename),
          },
        ];
        form.append('method', 'denuncia_aprobada');
        form.append('data', JSON.stringify({ data }));
        form.append('hasFiles', 'true');

        files.forEach((f, index) => {
          if (!f?.file || !f?.filename) {
            console.warn(`⚠️ Archivo inválido en posición ${index}:`, f);
          } else {
            console.log(
              `✅ ${f.filename} listo para enviar. Tamaño: ${f.file.length}`,
            );
          }
          form.append(f.filename, f.file, { filename: f.filename });
        });

        await axios.post(
          'https://vps-3941078-x.dattaweb.com/notificaciones-api/api/notifications/notifications-email',
          form,
          { headers: { 'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB' } },
        );

        // Generar datos para comprobante
        const now = new Date();
        const formatFechaHora = (fecha) =>
          fecha.toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        if (email !== 'omicsannicolas@sannicolas.gob.ar') {
          emailsEnviados.push({
            id: idTipoDoc,
            key,
            email,
            message:
              message === 'La denuncia en su contra fue' ||
              message === denuncianteFile.message
                ? `${message}: Aprobada`
                : message,
            fechaHora: formatFechaHora(now),
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
      };

      if (['email', 'ambos'].includes(envio_tipo)) {
        await sendEmail(
          denunciante_email,
          `Su denuncia contra ${info.denunciado} fue aprobada.`,
          denuncianteFiles,
          7,
          'COMPROBANTE_NOTIFICACION_DENUNCIANTE',
        );

        for (const d of denunciados) {
          const files = denunciadosFiles.filter(
            (f) => f.idDenunciado === d.id || !('idDenunciado' in f),
          );
          await sendEmail(
            d.email,
            'La denuncia en su contra fue aprobada.',
            [...files, ...archivos],
            8,
            'COMPROBANTE_NOTIFICACION_DENUNCIADO',
          );
        }
      }

      await sendEmail(
        'omicsannicolas@sannicolas.gob.ar',
        `Documentos de la denuncia Expte: Nº ${info.nro_expediente}`,
        [...denuncianteFiles, ...denunciadosFiles, ...archivos],
      );

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

      if (task) {
        await this.denunciaTasksService.markTaskAsExecuted(task.id);
        await this.denunciaEstadosService.markAsProcessed(
          id,
          data.estadoId,
          userId,
        );
        console.log(`☑️ Tarea marcada como ejecutada: ${task.jobId}`);
      }

      return {
        message: 'Correos enviados, documentos procesados y tarea completada.',
      };
    } catch (error) {
      console.error(`❌ [ERROR] ${error.message}`);
      console.error(`🧾 [STACK] ${error.stack}`);

      const task = await this.denunciaTasksService.findTaskByJobId(jobId);
      if (task) {
        await this.denunciaTasksService.markTaskAsFailed(
          task.id,
          error?.message || 'Error desconocido',
        );
        await this.denunciaEstadosService.markAsFailed(
          id,
          data.estadoId,
          data.userId,
          error?.message || 'Error desconocido',
        );
      }

      throw error;
    }
  }

  async procesarDenunciaCompleta(data: any) {
    const { id } = data;

    console.log(`📦 [PROCESAR] Encolando tareas para denuncia #${id}`);

    const aprobacion = await this.aprobarDenuncia(data);
    console.log(`✅ [APROBACION] Denuncia #${id} aprobada.`);

    const jobs = await this.queueService.getWaiting();
    console.log(
      'Jobs en espera:',
      jobs.map((j) => j.name),
    );

    return aprobacion;
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
        'https://vps-3941078-x.dattaweb.com/notificaciones-api/api/notifications/notifications-email',
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
      try {
        const causa = await this.causasService.findCausaByDenunciaId(
          denuncia.id,
        );

        if (causa) {
          await this.causasService.deleteCausa(causa.nroCausa);
        } else {
          console.log(
            `ℹ️ No existe causa registrada para la denuncia #${denuncia.id}`,
          );
        }
      } catch (err) {
        console.log(
          `ℹ️ No existe causa registrada para la denuncia #${denuncia.id}`,
        );
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

  private async getArchivosAdjuntos(denuncia): Promise<any[]> {
    console.log('📥 Descargando archivos desde el FTP...');

    const archivos = [];

    for (const archivo of denuncia.archivos) {
      console.log(`📂 Descargando: ${archivo.descripcion}`);

      try {
        // ⬇️ Nueva implementación usando la cola
        const buffer = await this.queueService.downloadFile(
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
      'https://vps-3941078-x.dattaweb.com/notificaciones-api/api/notifications/notifications-email',
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
    } = data;

    console.log('[INICIO] Procesando addDenunciado:', id);

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
      relations: [
        'archivos',
        'denunciante',
        'denunciadoDenuncia',
        'denunciadoDenuncia.denunciado',
      ],
    });

    if (!denuncia) {
      console.error('[ERROR] No se encontró la denuncia con ID:', id);
      throw new NotFoundException();
    }

    console.log('[INFO] Creando denunciado...');
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
      });
    }

    for (const e of postales) {
      await this.direccionesEnviadasService.create({
        datosNotificacionId: datosNotificacion.id,
        denunciadoId: denunciado.id,
        codPostal: e.codPostal,
      });
    }

    const fechaActual = this.getFechaActual();
    const fechaReunion = this.parseFechaReunion(date_link);

    const fusionarDenunciadosYPostales = (emails: any[], postales: any[]) => {
      const mapa = new Map();

      emails.forEach((emailObj) => {
        mapa.set(emailObj.email, {
          ...denunciado,
          email: emailObj.email,
          tipoEnvioArray: 'email',
        });
      });

      postales.forEach((postal) => {
        if (mapa.has(postal.email)) {
          const existente = mapa.get(postal.email);
          mapa.set(postal.email, {
            ...existente,
            codPostal: postal.codPostal,
            localidad: postal.localidad,
            tipoEnvioArray: 'ambos',
          });
        } else {
          mapa.set(postal.email || `${postal.codPostal}-${Date.now()}`, {
            ...denunciado,
            codPostal: postal.codPostal,
            localidad: postal.localidad,
            tipoEnvioArray: 'postal',
          });
        }
      });

      return Array.from(mapa.values());
    };

    const listaDenunciados = fusionarDenunciadosYPostales(emails, postales);
    console.log('[INFO] Lista fusionada de denunciados:', listaDenunciados);

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
      denunciados: denuncia.denunciadoDenuncia.map((e) => ({
        ...e.denunciado,
        dni: e.denunciado.dniCuilCuit,
        codpostal: e.denunciado.codPostal,
        tel: e.denunciado.telefono,
        telalt: e.denunciado.telefonoAlter,
      })),
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

    const ruta = `${this._dir}/${id}`;
    await this.ftpService.createDir(ruta);
    const denunciadosFiles = [];

    for (const denunciadoItem of listaDenunciados) {
      try {
        console.log(
          `[PDF] Generando PDF para denunciado ID: ${
            denunciadoItem.id || 'sin id'
          }`,
        );

        const denunciadoPDF = await generatePDF(
          {
            ...info,
            denunciado: denunciadoItem.nombre,
            email_denunciado:
              denunciadoItem.tipoEnvioArray === 'email' ||
              denunciadoItem.tipoEnvioArray === 'ambos'
                ? denunciadoItem.email
                : 'No disponible',
            direccion_denunciado:
              denunciadoItem.tipoEnvioArray === 'postal' ||
              denunciadoItem.tipoEnvioArray === 'ambos'
                ? `${denunciadoItem.codPostal} ${denunciadoItem.localidad}`
                : 'No disponible',
            envio_tipo,
          },
          'denunciado',
        );

        const filename = `${id}_CEDULA_DENUNCIADO_${denunciado.id}.pdf`;
        const remotePathDenunciado = `${ruta}/${filename}`;
        console.log(`[PDF] Guardando PDF en: ${remotePathDenunciado}`);

        console.log(`[FTP] Subiendo PDF a: ${remotePathDenunciado}`);
        await this.ftpService.fileUpload(
          Readable.from(denunciadoPDF),
          remotePathDenunciado,
        );

        denunciadosFiles.push({
          idDenunciado: denunciado.id,
          filename,
          file: denunciadoPDF,
        });

        const documentoTipo = await this.documentosTiposService.findByKey(
          'CEDULA_APERTURA_DENUNCIADO',
        );

        await this.denunciaDocumentosService.create({
          denunciaId: denuncia.id,
          documentoTipoId: documentoTipo.id,
          fileName: filename,
          path: remotePathDenunciado,
        });
      } catch (error) {
        console.error(
          '[ERROR] Al generar o subir el PDF del denunciado:',
          error,
        );
      }
    }

    const archivos = await this.getArchivosAdjuntos(denuncia);

    for (const denunciado of listaDenunciados) {
      const enviarMails =
        denunciado.tipoEnvioArray === 'email' ||
        denunciado.tipoEnvioArray === 'ambos';

      console.log(
        `[EMAIL] Procesando denunciado ${
          denunciado.email || denunciado.codPostal
        } | Enviar mail: ${enviarMails}`,
      );

      await this.procesarDenunciado({
        denunciado,
        info,
        files,
        archivos,
        id,
        denuncia,
        enviarMails,
      });
    }

    await this.ftpService.close();

    console.log('[INFO] Guardando movimiento...');

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

    console.log('[FIN] Proceso de addDenunciado finalizado.');
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

    const documentos = complaint.denunciaDocumentos;

    const filtrados: any[] = [];
    const tiposFiltrados = new Set();

    for (const doc of documentos) {
      const tipoId = doc.documentoTipo.id;
      if ((tipoId === 1 || tipoId === 4) && !tiposFiltrados.has(tipoId)) {
        filtrados.push(doc);
        tiposFiltrados.add(tipoId);
      } else if (tipoId !== 1 && tipoId !== 4) {
        filtrados.push(doc);
      }
    }

    return {
      ...complaint,
      denunciaDocumentos: filtrados,
    };
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

  async cambiarEstado(data, file) {
    let parsedPayload;
    try {
      parsedPayload =
        typeof data.payload === 'string' ? JSON.parse(data.payload) : data;
    } catch (error) {
      console.error('❌ Error al parsear payload:', error);
      throw new Error('Formato de payload inválido.');
    }

    const { id, estadoId, userId } = parsedPayload;

    const denuncia = await this.denunciaRepo.findOne({
      where: { id },
    });

    if (!denuncia) {
      console.error(`❌ Denuncia no encontrada con ID: ${id}`);
      throw new NotFoundException();
    }

    const estado = await this.estadosService.findOne(estadoId);
    if (!estado) {
      console.error(`❌ Estado no encontrado con ID: ${estadoId}`);
      throw new NotFoundException();
    }

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

    console.log(`✅ Estado cambiado exitosamente a: ${estado.descripcion}`);

    denuncia.estado = estado;
    denuncia.ultMovimiento = new Date();

    const updatedDenuncia = await this.denunciaRepo.save(denuncia);

    console.log(
      `📦 [PROCESAR] Encolando tarea para cambio de estado de denuncia #${id}`,
    );

    const filePath = await this.fileService.saveToTmp(file);
    const jobId = `notificar-cambio-estado-${Date.now()}-${id}`;

    await this.denunciaTasksService.createTask({
      denuncia,
      etapa: 'notificar-cambio-estado',
      prioridad: 1,
      jobId,
    });

    await this.queueService.addDenunciaTask(
      'notificar-cambio-estado',
      { ...parsedPayload, filePath, jobId },
      {
        jobId,
        priority: 1,
      },
    );

    return updatedDenuncia;
  }

  async notificarCambioEstado(data) {
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
      filePath,
      jobId,
    } = data;

    try {
      const task = await this.denunciaTasksService.findTaskByJobId(jobId);
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
      const buffer = await this.fileService.getBuffer(filePath);

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

          const fileName = `${id}_CAMBIO_ESTADO_${
            estado.key
          }_${Date.now()}.pdf`;
          const remotePath = `${ruta}/${fileName}`;

          const streamFile = Readable.from(buffer);
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
                    const sizeInBytes = buffer.length;
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
                      const sizeInBytes = buffer.length;
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
          form.append(fileName, buffer, { filename: fileName });

          try {
            const response = await axios.post(
              'https://vps-3941078-x.dattaweb.com/notificaciones-api/api/notifications/notifications-email',
              form,
              {
                headers: {
                  'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
                },
              },
            );

            for (const email of emailsEnviados) {
              email.fechaHora = this.formatFechaHora(new Date());
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

          await Promise.all(
            denunciados.map(async (denunciado) => {
              return this.direccionesEnviadasService.create({
                datosNotificacionId: datosNotificacion.id,
                denunciadoId: denunciado.id,
                email: denunciado.email,
              });
            }),
          );

          await this.denunciaDocumentosService.create({
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

          const streamFile = Readable.from(buffer);
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

          await Promise.all(
            postales.map(async (denunciado) => {
              return this.direccionesEnviadasService.create({
                datosNotificacionId: datosNotificacion.id,
                denunciadoId: denunciado.id,
                codPostal: denunciado.codPostal,
              });
            }),
          );

          await this.denunciaDocumentosService.create({
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

          const streamFile = Readable.from(buffer);
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
                    const sizeInBytes = buffer.length;
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
                      const sizeInBytes = buffer.length;

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
          form.append(fileName, buffer, { filename: fileName });

          try {
            const response = await axios.post(
              'https://vps-3941078-x.dattaweb.com/notificaciones-api/api/notifications/notifications-email',
              form,
              {
                headers: {
                  'api-key': 'fJfCznx805geZEjuvAU533raN4HNh4WB',
                },
              },
            );

            for (const email of emailsEnviados) {
              email.fechaHora = this.formatFechaHora(new Date());
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

          await Promise.all([
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

          await this.denunciaDocumentosService.create({
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

      if (task) {
        await this.denunciaTasksService.markTaskAsExecuted(task.id);
        await this.denunciaEstadosService.markAsProcessed(id, estadoId, userId);
        console.log(`☑️ Tarea marcada como ejecutada: ${task.jobId}`);
      }
      // Eliminar archivo temporal
      await this.fileService.deleteTmp(filePath);

      return updatedDenuncia;
    } catch (error) {
      console.error(`❌ [ERROR] ${error.message}`);
      console.error(`🧾 [STACK] ${error.stack}`);

      const task = await this.denunciaTasksService.findTaskByJobId(jobId);
      if (task) {
        await this.denunciaTasksService.markTaskAsFailed(
          task.id,
          error?.message || 'Error desconocido',
        );
        await this.denunciaEstadosService.markAsFailed(
          id,
          estadoId,
          userId,
          error?.message || 'Error desconocido',
        );
      }

      throw error;
    }
  }

  async procesarCambioEstado(data, file) {
    const cambioEstado = await this.cambiarEstado(data, file);

    const jobs = await this.queueService.getWaiting();
    console.log(
      'Jobs en espera:',
      jobs.map((j) => j.id),
    );

    return cambioEstado;
  }

  formatFechaHora(fecha) {
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
}
