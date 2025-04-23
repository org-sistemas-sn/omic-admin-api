import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, QueueEvents, JobsOptions } from 'bullmq';
import { redisConnection } from './redis.config';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private ftpQueueEvents: QueueEvents;
  private denunciaQueueEvents: QueueEvents;

  constructor(
    @InjectQueue('ftp-tasks') private readonly ftpQueue: Queue,
    @InjectQueue('denuncia-tasks') private readonly denunciaQueue: Queue,
  ) {
    // 🎧 FTP queue events
    this.ftpQueueEvents = new QueueEvents('ftp-tasks', {
      connection: redisConnection,
    });

    // 🎧 DENUNCIA queue events
    this.denunciaQueueEvents = new QueueEvents('denuncia-tasks', {
      connection: redisConnection,
    });

    this.denunciaQueueEvents.on('waiting', ({ jobId }) => {
      console.log(`⏳ [denuncia-tasks] Job esperando: ${jobId}`);
    });

    this.denunciaQueueEvents.on('active', ({ jobId, prev }) => {
      console.log(`🏃 [denuncia-tasks] Job activo: ${jobId} (prev: ${prev})`);
    });

    this.denunciaQueueEvents.on('completed', ({ jobId }) => {
      console.log(`✅ [denuncia-tasks] Job completado: ${jobId}`);
    });

    this.denunciaQueueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(
        `❌ [denuncia-tasks] Job falló: ${jobId} | Motivo: ${failedReason}`,
      );
    });

    this.denunciaQueueEvents.on('stalled', ({ jobId }) => {
      console.warn(`⚠️ [denuncia-tasks] Job atascado: ${jobId}`);
    });
  }

  // ✅ FTP QUEUE
  getQueueEvents(): QueueEvents {
    return this.ftpQueueEvents;
  }

  async addTask(data: any, opts?: JobsOptions): Promise<Job> {
    return this.ftpQueue.add(data.tipo, data, opts);
  }

  async downloadFile(remotePath: string): Promise<Buffer> {
    const job = await this.ftpQueue.add('ftp-job', {
      tipo: 'download',
      file: { remotePath },
    });

    const queueEvents = new QueueEvents('ftp-tasks', {
      connection: redisConnection,
    });
    await queueEvents.waitUntilReady();

    const result = await job.waitUntilFinished(queueEvents);
    await queueEvents.close();

    return Buffer.from(result, 'base64');
  }

  // ✅ DENUNCIA QUEUE
  async addDenunciaTask(
    tipo: 'aprobar-denuncia' | 'subir-documentos' | 'notificar-por-correo',
    data: any,
    opts?: JobsOptions,
  ): Promise<Job> {
    console.log('🚀 [QueueService] addDenunciaTask', tipo, data, opts);
    return this.denunciaQueue.add(tipo, data, opts);
  }

  async getWaiting(): Promise<Job[]> {
    return this.denunciaQueue.getJobs(['waiting', 'delayed', 'active']);
  }

  async onModuleDestroy() {
    await this.ftpQueueEvents.close();
    await this.denunciaQueueEvents.close();
  }
}
