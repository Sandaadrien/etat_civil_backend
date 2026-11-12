import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

import type { Express } from 'express';

import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // 1. Récupérer l'instance Express avec un typage explicite
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  // 2. Enregistrer le handler Better Auth
  expressApp.all('/api/auth/*path', toNodeHandler(auth));

  // 3. Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Mon API')
    .setDescription('API de mon application')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  // 4. Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5. CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://192.168.11.243:5173'],
    credentials: true,
  });

  // 6. Démarrage
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
