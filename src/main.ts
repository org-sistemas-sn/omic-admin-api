import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { PinoLogger } from 'nestjs-pino';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = await app.resolve(PinoLogger);

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     transformOptions: {
  //       enableImplicitConversion: true,
  //     },
  //   }),
  // );

  app.enableCors({
    origin: [
      `https://omic-sn-admin.netlify.app`,
      `http://localhost:3000`,
      `https://stage--omic-sn-admin.netlify.app`,
      `https://omic-sn.netlify.app`,
      `https://testing5.sannicolasciudad.gob.ar`,
      `https://testing6.sannicolasciudad.gob.ar`,
      `https://omic.sannicolas.gob.ar`,
      `https://omic-admin.sannicolas.gob.ar`,
    ],
    credentials: true,
  });

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Omic Admin API')
    .setDescription('Documentación de Endpoints')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
