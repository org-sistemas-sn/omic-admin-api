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
  FindOptionsOrderValue,
  FindOptionsWhere,
  IsNull,
  Like,
  Not,
  Repository,
} from 'typeorm';

import { DenunciasService } from 'src/denuncias/services/denuncias.service';
import { Causa } from '../entities/causa.entity';
import { FilterCauseDto } from 'src/denuncias/dtos/filter.dto';
import { Denuncia } from 'src/denuncias/entities/denuncia.entity';

@Injectable()
export class CausasService {
  constructor(
    @InjectRepository(Causa) private causasRepo: Repository<Causa>,
    @Inject(forwardRef(() => DenunciasService))
    private denunciasService: DenunciasService,
  ) {}

  async create(data: { anioCausa: number; denunciaId: number }) {
    const denuncia = await this.denunciasService.findOne(data.denunciaId);

    if (!denuncia) {
      throw new NotFoundException(
        `Denuncia con ID ${data.denunciaId} no encontrada.`,
      );
    }

    const newRecord = this.causasRepo.create({
      anioCausa: data.anioCausa,
      denuncia,
    });
    const record = await this.causasRepo.save(newRecord);

    if (!record) {
      throw new NotFoundException();
    }

    return record;
  }

  async findCausaByDenunciaId(denunciaId: number) {
    const record = await this.causasRepo.findOne({
      where: {
        denuncia: { id: denunciaId },
      },
      relations: ['denuncia'],
    });

    if (!record) {
      throw new NotFoundException();
    }

    return record;
  }

  async deleteCausa(nroCausa: number) {
    const causa = await this.causasRepo.findOne({
      where: { nroCausa },
    });

    if (!causa) {
      throw new NotFoundException(
        `La causa con nroCausa ${nroCausa} no existe.`,
      );
    }
    await this.causasRepo.update({ nroCausa }, { deletedAt: new Date() });

    return { message: `Causa ${nroCausa} eliminada correctamente.` };
  }

  async findCausas(params?: FilterCauseDto) {
    try {
      const relations = [
        'denuncia',
        'denuncia.estado',
        'denuncia.autorizado',
        'denuncia.denunciante',
        'denuncia.denunciadoDenuncia',
        'denuncia.denunciadoDenuncia.denunciado',
        'denuncia.denunciaEstados',
      ];

      if (!params) return this.causasRepo.find({ relations });

      const {
        limit,
        offset,
        anioCausa,
        nroCausa,
        nroExpediente,
        denunciante,
        dni,
        date,
        email,
        estado,
        orden = 'desc',
      } = params;

      const denunciaWhere: FindOptionsWhere<Denuncia> = {
        id: Not(IsNull()),
        // fecha: MoreThanOrEqual(
        //   new Date(this.startDateDenuncia.replaceAll('-', '/')),
        // ),
      };

      if (date) {
        const inicio = new Date(date);
        inicio.setUTCHours(0, 0, 0, 0);
        const fin = new Date(date);
        fin.setUTCHours(23, 59, 59, 999);
        denunciaWhere.fecha = Between(inicio, fin);
      }

      if (nroExpediente) {
        denunciaWhere.nroExpediente = nroExpediente;
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

        denunciaWhere.denunciante = [...apellidoMatch, ...nombreMatch];
      } else if (dni || email) {
        denunciaWhere.denunciante = {
          ...(dni && { dni: Like(`%${dni}%`) }),
          ...(email && { email: Like(`%${email}%`) }),
        };
      }

      if (estado) {
        denunciaWhere.estado = Equal(estado);
      }

      const causaWhere: FindOptionsWhere<Causa> = {
        deletedAt: null,
      };

      if (nroCausa) {
        causaWhere.nroCausa = nroCausa;
      }

      if (anioCausa) {
        causaWhere.anioCausa = anioCausa;
      }

      const direction: FindOptionsOrderValue =
        orden?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const queryOptions = {
        relations,
        where: {
          ...causaWhere,
          denuncia: denunciaWhere,
        },
        order: {
          nroCausa: direction,
        },
        ...(limit && { take: limit }),
        ...(offset && { skip: offset }),
      };

      return this.causasRepo.find(queryOptions);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(nroCausa: number) {
    const relations = [
      'denuncia',
      'denuncia.estado',
      'denuncia.autorizado',
      'denuncia.denunciante',
      'denuncia.denunciadoDenuncia',
      'denuncia.denunciadoDenuncia.denunciado',
      'denuncia.datosNotificacion',
      'denuncia.datosNotificacion.direccionesEnviadas',
      'denuncia.datosNotificacion.direccionesEnviadas.denunciante',
      'denuncia.datosNotificacion.direccionesEnviadas.denunciado',
      'denuncia.datosNotificacion.denunciaEstado',
      'denuncia.datosNotificacion.denunciaEstado.estado',
      'denuncia.datosNotificacion.usuario',
    ];
    const cause = await this.causasRepo.findOne({
      where: {
        nroCausa,
        deletedAt: null,
      },
      relations,
    });
    if (!cause) {
      throw new NotFoundException();
    }
    return cause;
  }

  async archivos(nroCausa: number) {
    const relations = ['denuncia', 'denuncia.archivos'];
    const cause = await this.causasRepo.findOne({
      where: { nroCausa },
      relations,
    });
    if (!cause) {
      throw new NotFoundException();
    }
    return cause;
  }

  async documentos(nroCausa: number) {
    const relations = [
      'denuncia',
      'denuncia.denunciaDocumentos',
      'denuncia.denunciaDocumentos.documentoTipo',
    ];
    const cause = await this.causasRepo.findOne({
      where: { nroCausa },
      relations,
    });
    if (!cause) {
      throw new NotFoundException();
    }
    return cause;
  }

  async findAll() {
    const records = await this.causasRepo.find();
    if (!records) {
      throw new NotFoundException();
    }
    return records;
  }

  async createCauses() {
    const denuncias = await this.denunciasService.findAll({
      estado: 2,
    });
    console.log(denuncias.length);

    const promises = denuncias.map((e) => {
      const causa = this.causasRepo.create({
        anioCausa: new Date().getFullYear(),
        denuncia: e,
      });

      return this.causasRepo.save(causa);
    });
    await Promise.all(promises);

    return denuncias;
  }
}
