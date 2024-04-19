import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     transformOptions: {
  //       enableImplicitConversion: true,
  //     },
  //   }),
  // );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.enableCors({
    origin: [
      `https://omic-sn-admin.netlify.app`,
      `http://localhost:3000`,
      `https://stage--omic-sn-admin.netlify.app`,
      `https://omic-sn.netlify.app`,
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.use(cookieParser());

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
