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
import { parse } from 'date-fns';
import { es } from 'date-fns/locale';

const expectedHeaders = [
  'nro.expediente',
  'denunciante',
  'denunciado 1',
  'denunciado 2',
  'fecha inicio',
  'estado',
];

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

    // Validar orden
    const isOrdered = expectedHeaders.every(
      (field, index) => headers[index] === field,
    );
    if (!isOrdered) {
      throw new BadRequestException(
        'Las columnas no están en el orden esperado',
      );
    }

    const dataRows = worksheet.getRows(2, worksheet.rowCount - 1);
    const causas = [];
    const filasIgnoradas: any[] = [];

    for (const row of dataRows) {
      const nroExpediente = String(row.getCell(1).text).trim();
      const denunciante = String(row.getCell(2).text).trim();
      const denunciado1 = String(row.getCell(3).text).trim();
      const denunciado2 = String(row.getCell(4).text).trim();
      const fechaRaw = String(row.getCell(5).text).trim();
      const estado = String(row.getCell(6).text).trim();

      // Verificar que haya datos mínimos
      if (!nroExpediente || !fechaRaw) {
        filasIgnoradas.push({
          fila: row.number,
          nroExpediente,
          denunciante,
          denunciado1,
          denunciado2,
          fechaInicio: fechaRaw,
          estado,
          motivo: 'Faltan nroExpediente o fechaInicio',
        });
        continue;
      }

      // Parsear fecha
      let fechaParseada: string | null = null;

      const posiblesFormatos = [
        "EEEE, d 'de' MMMM 'de' yyyy",
        "d 'de' MMMM 'de' yyyy",
        'EEE MMM dd yyyy HH:mm:ss',
        'yyyy-MM-dd',
      ];

      for (const formato of posiblesFormatos) {
        try {
          const parsed = parse(fechaRaw, formato, new Date(), { locale: es });
          if (!isNaN(parsed.getTime())) {
            fechaParseada = parsed.toISOString().split('T')[0];
            break;
          }
        } catch {}
      }

      if (!fechaParseada) {
        filasIgnoradas.push({
          fila: row.number,
          nroExpediente,
          denunciante,
          denunciado1,
          denunciado2,
          fechaInicio: fechaRaw,
          estado,
          motivo: 'Fecha inválida',
        });
        continue;
      }

      const causa = this.causaNoDigitalRepo.create({
        nroExpediente,
        denunciante,
        fechaInicio: fechaParseada,
        estado,
        denunciados: [
          this.denunciadoNoDigitalRepo.create({ nombre: denunciado1 }),
          ...(denunciado2 && !denunciado2.startsWith('XXXXXX')
            ? [this.denunciadoNoDigitalRepo.create({ nombre: denunciado2 })]
            : []),
        ],
      });

      causas.push(causa);
    }

    await this.causaNoDigitalRepo.save(causas);

    if (filasIgnoradas.length) {
      console.log('\n❌ Filas ignoradas por problemas:');
      console.table(filasIgnoradas);
    }

    return {
      message: 'Carga completada con éxito',
      statusCode: HttpStatus.CREATED,
      cantidad: causas.length,
      filasIgnoradas: filasIgnoradas.length,
    };
  }
}
