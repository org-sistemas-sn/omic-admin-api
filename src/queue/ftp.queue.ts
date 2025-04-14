import { Queue } from 'bullmq';
import { redisConnection } from './redis.config';

export const ftpQueue = new Queue('ftp-tasks', {
  connection: redisConnection,
});
