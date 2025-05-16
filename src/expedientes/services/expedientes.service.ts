// src/expedientes/services/expedientes.service.ts
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Causa } from 'src/causas/entities/causa.entity';
import { CausaNoDigitalizada } from 'src/causas/entities/causaNoDigitalizada.entity';
import { DenunciadoNoDigitalizado } from 'src/causas/entities/denunciadoNoDigitalizado.entity';
import * as ExcelJS from 'exceljs';
import { FilterExpedientesDto } from '../dtos/filter-expedientes.dto';
import { ExpedienteDto } from '../dtos/expediente.dto';
import * as moment from 'moment';
import 'moment/locale/es';

const expectedHeaders = [
  'nro.expediente',
  'denunciante',
  'denunciado 1',
  'denunciado 2',
  'fecha inicio',
  'estado',
];

const corregirFechaRaw = (fecha: string): string => {
  return (
    fecha
      .normalize('NFD') // elimina tildes compuestas
      .replace(/[^\w\s,\.áéíóúÁÉÍÓÚñÑ]/g, '') // elimina símbolos raros excepto punto y coma
      .replace(/\.(?=\s|$)/g, '') // elimina puntos sueltos al final
      .replace(/([a-záéíóúñ])[,\.](\d)/gi, '$1, $2') // lunes.11 → lunes, 11
      .replace(/(\d{1,2}),(\s*de)/gi, '$1 $2') // asegura espacio entre número y "de"
      .replace(/(\d{1,2})de\s+([a-z]+)/gi, '$1 de $2') // asegura espacio entre número y mes
      .replace(/\s+/g, ' ') // colapsa espacios múltiples
      .replace(/ ,/g, ',') // quita espacio antes de coma
      .replace(/,(\S)/g, ', $1') // agrega espacio después de coma si falta
      .replace(/de\s+de/gi, 'de') // corrige "de de"
      .replace(/de(\d{4})/gi, 'de $1') // corrige "de2022"
      .replace(/\b0(\d)\b/g, '$1') // elimina ceros a la izquierda en días

      // Correcciones de errores comunes en los meses
      .replace(/nviembre|novimbre|noveimbre/gi, 'noviembre')
      .replace(/septiemre|septimbre/gi, 'septiembre')
      .replace(/enerp|eneri|eneriio/gi, 'enero')
      .replace(/marzi/gi, 'marzo')

      // Días de la semana
      .replace(/miercoles/gi, 'miércoles')
      .replace(/sabado/gi, 'sábado')
      .replace(/domingo/gi, 'domingo')
      .replace(/lunes/gi, 'lunes')
      .replace(/martes/gi, 'martes')
      .replace(/miércoles/gi, 'miércoles')
      .replace(/jueves/gi, 'jueves')
      .replace(/viernes/gi, 'viernes')

      // Corrige caso puntual "4 d abril"
      .replace(/(\d{1,2})\s+d\s+([a-z]+)/gi, '$1 de $2')

      .trim()
      .toLowerCase()
  );
};

export const parsearFechaConFormatos = (fecha: string): string | null => {
  const corregida = corregirFechaRaw(fecha);
  const posiblesFormatos = [
    'dddd, DD [de] MMMM [de] YYYY', // ← para "miércoles, 16 de julio de 2024"
    'dddd, D [de] MMMM [de] YYYY', // ya está
    'dddd D [de] MMMM [de] YYYY',
    'D [de] MMMM [de] YYYY',
    'D [de] MMMM YYYY',
    'dddd D MMMM [de] YYYY',
    'D MMMM [de] YYYY',
    'DD/MM/YYYY',
    'D/M/YYYY',
  ];

  for (const formato of posiblesFormatos) {
    const parsed = moment(corregida, formato, true).locale('es');
    if (parsed.isValid()) {
      console.log(`✅ Fecha válida: ${parsed.format('YYYY-MM-DD')}`);
      return parsed.format('YYYY-MM-DD');
    }
  }

  return null;
};

@Injectable()
export class ExpedientesService {
  constructor(
    @InjectRepository(Causa)
    private causaRepo: Repository<Causa>,

    @InjectRepository(CausaNoDigitalizada)
    private causaNoDigitalRepo: Repository<CausaNoDigitalizada>,

    @InjectRepository(DenunciadoNoDigitalizado)
    private denunciadoNoDigitalRepo: Repository<DenunciadoNoDigitalizado>,
  ) {}

  async getExpedientes(
    page = 1,
    limit = 10,
    filters?: FilterExpedientesDto,
  ): Promise<{
    page: number;
    limit: number;
    totalItems: number;
    data: ExpedienteDto[];
  }> {
    const skip = (page - 1) * limit;

    const causasDigitales = await this.causaRepo.find({
      relations: [
        'denuncia',
        'denuncia.denunciante',
        'denuncia.estado',
        'denuncia.denunciadoDenuncia',
        'denuncia.denunciadoDenuncia.denunciado',
      ],
      where: {
        deletedAt: null,
        denuncia: {
          id: Not(IsNull()),
        },
      },
    });

    const causasNoDigitalizadas = await this.causaNoDigitalRepo.find({
      relations: ['denunciados'],
    });

    const expedientesDigitales = causasDigitales.map((causa) => {
      const denuncia = causa.denuncia;
      return {
        idCausa: causa.nroCausa,
        nroExpediente: denuncia?.nroExpediente,
        denunciante:
          denuncia?.denunciante?.nombre && denuncia?.denunciante?.apellido
            ? `${denuncia.denunciante.nombre} ${denuncia.denunciante.apellido}`
            : 'Sin nombre',
        denunciados:
          denuncia?.denunciadoDenuncia?.map((d) => d.denunciado?.nombre) ?? [],
        fecha: causa?.createAt?.toISOString().split('T')[0] ?? null,
        estado: denuncia?.estado?.descripcion ?? 'Sin estado',
        tipo: 'digital' as const,
      };
    });

    const expedientesNoDigitales = causasNoDigitalizadas.map((c) => ({
      idCausaNoDigitalizada: c.id,
      nroExpediente: c.nroExpediente,
      denunciante: c.denunciante,
      denunciados: c.denunciados.map((d) => d.nombre),
      fecha: c.fechaInicio,
      estado: c.estado,
      tipo: 'no_digital' as const,
    }));

    const all = [...expedientesDigitales, ...expedientesNoDigitales].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

    const filtered = all.filter((exp) => {
      if (
        filters?.nroExpediente &&
        !exp.nroExpediente.includes(filters.nroExpediente)
      )
        return false;
      if (filters?.anio && !exp.fecha.startsWith(String(filters.anio)))
        return false;
      if (
        filters?.nombreDenunciante &&
        !exp.denunciante
          .toLowerCase()
          .includes(filters.nombreDenunciante.toLowerCase())
      )
        return false;
      if (
        filters?.nombreDenunciado &&
        !exp.denunciados.some((d) =>
          d?.toLowerCase().includes(filters.nombreDenunciado.toLowerCase()),
        )
      )
        return false;
      if (filters?.desde && new Date(exp.fecha) < new Date(filters.desde))
        return false;
      return true;
    });

    const totalItems = filtered.length;
    const data = filtered.slice(skip, skip + limit);

    return {
      page,
      limit,
      totalItems,
      data,
    };
  }

  async actualizarEstado(id: number, estado: string) {
    const causa = await this.causaNoDigitalRepo.findOneBy({ id });
    if (!causa) throw new NotFoundException('Causa no encontrada');
    causa.estado = estado;
    return this.causaNoDigitalRepo.save(causa);
  }

  async importarDesdeExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const headersRow = worksheet.getRow(1);
    const headers: string[] = [];

    headersRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.text?.toLowerCase().trim());
    });

    const missingFields = expectedHeaders.filter(
      (field) => !headers.includes(field),
    );

    if (missingFields.length) {
      const errors = missingFields.map((f) => `Falta la columna ${f}`);
      throw new BadRequestException(errors);
    }

    const dataRows = worksheet.getRows(2, worksheet.rowCount - 1);
    const causas: CausaNoDigitalizada[] = [];
    const filasIgnoradas: any[] = [];

    for (const row of dataRows) {
      const nroExpedienteRaw = row.getCell(1).text.trim();
      const denunciante = String(row.getCell(2).text).trim();
      const denunciado1 = String(row.getCell(3).text).trim();
      const denunciado2 = String(row.getCell(4).text).trim();
      const estado = String(row.getCell(6).text).trim();

      const fechaCell = row.getCell(5);
      let fechaRaw = '';
      let fechaParseada: string | null = null;
      let fechaCorregida = '';
      let fechaInvalida = false;

      if (
        fechaCell.type === ExcelJS.ValueType.Date &&
        fechaCell.value instanceof Date
      ) {
        fechaParseada = fechaCell.value.toISOString().split('T')[0];
      } else {
        fechaRaw = String(fechaCell.text).trim();

        if (!fechaRaw || fechaRaw.includes('#') || !isNaN(Number(fechaRaw))) {
          fechaInvalida = true;
        } else {
          fechaCorregida = corregirFechaRaw(fechaRaw);
          fechaParseada = parsearFechaConFormatos(fechaRaw);
          if (!fechaParseada) fechaInvalida = true;
        }
      }

      const nroExpedienteInvalido =
        !nroExpedienteRaw || nroExpedienteRaw === '0';

      if (nroExpedienteInvalido || fechaInvalida) {
        let motivo = '';
        if (nroExpedienteInvalido && fechaInvalida)
          motivo = 'Expediente y fecha inválidos';
        else if (nroExpedienteInvalido)
          motivo = 'Número de expediente inválido';
        else motivo = 'Fecha inválida';

        filasIgnoradas.push({
          fila: row.number,
          nroExpediente: nroExpedienteRaw,
          fechaInicio: fechaRaw || fechaCell.value,
          fechaCorregida,
          motivo,
        });
        continue;
      }

      const denunciados = [
        this.denunciadoNoDigitalRepo.create({ nombre: denunciado1 }),
        ...(denunciado2 && !denunciado2.startsWith('XXXXXX')
          ? [this.denunciadoNoDigitalRepo.create({ nombre: denunciado2 })]
          : []),
      ];

      const existente = await this.causaNoDigitalRepo.findOne({
        where: { nroExpediente: nroExpedienteRaw },
        relations: ['denunciados'],
      });

      if (existente) {
        existente.denunciante = denunciante;
        existente.fechaInicio = fechaParseada;
        existente.estado = estado;

        const updated = await this.causaNoDigitalRepo.save(existente);
        causas.push(updated); // ✅ Agregado al array

        const nuevosDenunciados = [
          this.denunciadoNoDigitalRepo.create({
            nombre: denunciado1,
            causa: existente,
          }),
          ...(denunciado2 && !denunciado2.startsWith('XXXXXX')
            ? [
                this.denunciadoNoDigitalRepo.create({
                  nombre: denunciado2,
                  causa: existente,
                }),
              ]
            : []),
        ];
        await this.denunciadoNoDigitalRepo.save(nuevosDenunciados);
      } else {
        const nueva = this.causaNoDigitalRepo.create({
          nroExpediente: nroExpedienteRaw,
          denunciante,
          fechaInicio: fechaParseada,
          estado,
        });

        const saved = await this.causaNoDigitalRepo.save(nueva);
        causas.push(saved); // ✅ Agregado al array

        const nuevosDenunciados = [
          this.denunciadoNoDigitalRepo.create({
            nombre: denunciado1,
            causa: saved,
          }),
          ...(denunciado2 && !denunciado2.startsWith('XXXXXX')
            ? [
                this.denunciadoNoDigitalRepo.create({
                  nombre: denunciado2,
                  causa: saved,
                }),
              ]
            : []),
        ];

        await this.denunciadoNoDigitalRepo.save(nuevosDenunciados);
      }
    }

    if (filasIgnoradas.length) {
      console.log('\n❌ Filas ignoradas por errores:');
      console.table(filasIgnoradas);
    }

    return {
      message: 'Carga completada con éxito',
      statusCode: HttpStatus.CREATED,
      cantidad: causas.length,
      filasIgnoradas: filasIgnoradas.length,
      detalleFilasIgnoradas: filasIgnoradas,
    };
  }
}
