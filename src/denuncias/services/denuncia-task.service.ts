import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DenunciaTasks } from '../entities/denuncia-task.entity';
import { Denuncia } from '../entities/denuncia.entity';

@Injectable()
export class DenunciaTasksService {
  constructor(
    @InjectRepository(DenunciaTasks)
    private readonly tasksRepo: Repository<DenunciaTasks>,
  ) {}

  async createTask({
    denuncia,
    etapa,
    prioridad = 1,
  }: {
    denuncia: Denuncia;
    etapa: string;
    prioridad?: number;
    creado_por?: number;
  }) {
    const task = this.tasksRepo.create({
      denuncia,
      etapa,
      estado: 'EN_COLA',
      prioridad,
      intentos: 0,
    });
    return this.tasksRepo.save(task);
  }

  async markTaskAsExecuted(id: number) {
    return this.tasksRepo.update(id, {
      estado: 'EJECUTADO',
      fecha_ejecucion: new Date(),
    });
  }

  async markTaskAsExecutedByEtapa(denunciaId: number, etapa: string) {
    const task = await this.tasksRepo.findOne({
      where: {
        denuncia: { id: denunciaId },
        etapa,
        estado: 'EN_COLA',
      },
    });

    if (!task) return null;

    return this.markTaskAsExecuted(task.id);
  }

  async markTaskAsFailed(id: number) {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) return null;

    return this.tasksRepo.update(id, {
      estado: 'FALLIDO',
      intentos: (task.intentos || 0) + 1,
    });
  }

  async findTasksByEstado(estado: 'EN_COLA' | 'EJECUTADO' | 'FALLIDO') {
    return this.tasksRepo.find({
      where: { estado },
      relations: ['denuncia'],
      order: { prioridad: 'ASC', fecha_creacion: 'ASC' },
    });
  }

  async findTasksByDenuncia(denunciaId: number) {
    return this.tasksRepo.find({
      where: { denuncia: { id: denunciaId } },
      order: { fecha_creacion: 'DESC' },
    });
  }
}
