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
      `https://testing5.sannicolasciudad.gob.ar`,
      `https://testing6.sannicolasciudad.gob.ar`,
      `https://omic.sannicolas.gob.ar`,
      `https://omic-admin.sannicolas.gob.ar`,
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

 // Acceder a la instancia de Express y extender el timeout
 const expressApp = app.getHttpAdapter().getInstance();

 expressApp.use((req, res, next) => {
   // Aumentar el timeout a 10 minutos
   req.setTimeout(600000);
   res.setTimeout(600000);
   next();
 });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
