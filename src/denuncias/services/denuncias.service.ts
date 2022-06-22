import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, Like, Repository } from 'typeorm';

import { Denuncia } from '../entities/denuncia.entity';
import { CreateComplaintDto } from '../dtos/denuncia.dto';
import { AutorizadosService } from './autorizados.service';
import { DenunciantesService } from './denunciantes.service';
import { DenunciadosService } from './denunciados.service';
import { EstadosService } from './estados.service';
import { FilterComplaintDto } from '../dtos/filter.dto';

@Injectable()
export class DenunciasService {
  constructor(
    @InjectRepository(Denuncia) private denunciaRepo: Repository<Denuncia>,
    private autorizadoService: AutorizadosService,
    private denunciantesService: DenunciantesService,
    private denunciadosService: DenunciadosService,
    private estadosService: EstadosService,
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
      const state = await this.estadosService.findOne(1);
      const newComplaint = this.denunciaRepo.create(complaint);
      newComplaint.estado = state;
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
        'denunciante',
        'denunciados',
        'denunciados.empresa',
        'denunciante.autorizado',
        'foja',
        'foja.archivos',
      ];
      if (params) {
        const where: FindConditions<Denuncia> = {};
        const { limit, offset } = params;
        const { denunciante, fechaInicio, dni, estadoGeneral, estado } = params;

        if (denunciante)
          where.denunciante = { nombre: Like(`%${denunciante}%`) };
        if (fechaInicio) where.createAt = Like(`%${fechaInicio}%`);
        if (dni) where.denunciante = { dniCuil: Like(`%${dni}%`) };
        if (estadoGeneral) where.estadoGeneral = estadoGeneral;
        if (estado) where.estado = { nombre: estado };

        if (!limit) {
          return this.denunciaRepo.find({ relations, where });
        }

        return this.denunciaRepo.find({
          relations,
          where,
          take: limit,
          skip: offset,
        });
      }
      return this.denunciaRepo.find({ relations });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
