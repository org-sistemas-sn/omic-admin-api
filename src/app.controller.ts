import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { QueueService } from './queue/queue.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-ftp-task')
  async testFtpTask(): Promise<string> {
    await this.queueService.addTask({
      tipo: 'descarga',
      archivo: 'archivo-prueba.pdf',
    });

    return 'Tarea FTP encolada ✅';
  }
}
