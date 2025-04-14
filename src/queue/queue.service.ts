import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('ftp-tasks') private readonly queue: Queue) {}

  async addTask(data: any) {
    await this.queue.add('ftp-job', data);
  }
}
