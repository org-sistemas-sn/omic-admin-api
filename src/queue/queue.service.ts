import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, QueueEvents, JobsOptions } from 'bullmq';
import { redisConnection } from './redis.config';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private queueEvents: QueueEvents;

  constructor(@InjectQueue('ftp-tasks') private readonly queue: Queue) {
    this.queueEvents = new QueueEvents('ftp-tasks', {
      connection: redisConnection,
    });
  }

  getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }

  async addTask(data: any, opts?: JobsOptions): Promise<Job> {
    return this.queue.add('ftp-job', data, opts);
  }

  async downloadFile(remotePath: string): Promise<Buffer> {
    const job = await this.queue.add('ftp-job', {
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

  async onModuleDestroy() {
    await this.queueEvents.close();
  }
}
