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
  Like,
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
    const newRecord = this.causasRepo.create(data);
    const record = await this.causasRepo.save(newRecord);

    if (!record) {
      throw new NotFoundException();
    }
    return record;
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
      if (params) {
        const where: FindOptionsWhere<Denuncia> = {};
        const { limit, offset } = params;

        const {
          anioCausa,
          nroCausa,
          nroExpediente,
          denunciante,
          dni,
          email,
          estado,
          date,
          ultMovimiento,
          orden = 'DESC',
        } = params;

        if (date) {
          where.fecha = new Date(date.replaceAll('-', '/'));
        }
        if (ultMovimiento) {
          where.ultMovimiento = new Date(ultMovimiento.replaceAll('-', '/'));
        }
        if (nroExpediente) {
          where.nroExpediente = nroExpediente;
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
        }

        const causaWhere: { nroCausa?: number; anioCausa?: number } = {};

        if (nroCausa) {
          causaWhere.nroCausa = nroCausa;
        }
        if (anioCausa) {
          causaWhere.anioCausa = anioCausa;
        }

        if (!limit) {
          return this.causasRepo.find({
            relations,
            where: {
              ...causaWhere,
              denuncia: where,
            },
          });
        }
        return this.causasRepo.find({
          relations,
          where: {
            ...causaWhere,
            denuncia: where,
          },
          take: limit,
          skip: offset,
          order: {
            nroCausa: orden,
          },
        });
      }
      return this.causasRepo.find({ relations });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(nroCausa: number) {
    const record = await this.causasRepo.findOneBy({ nroCausa });
    if (!record) {
      throw new NotFoundException();
    }
    return record;
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
