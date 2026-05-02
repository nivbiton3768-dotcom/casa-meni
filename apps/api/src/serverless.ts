import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

let cachedHandler: any;

async function bootstrap() {
  if (cachedHandler) return cachedHandler;

  const expressApp = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  nestApp.setGlobalPrefix('api/v1');

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  nestApp.enableCors({ origin: allowedOrigins, credentials: true });

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  nestApp.useGlobalFilters(new GlobalExceptionFilter());
  nestApp.useGlobalInterceptors(new TransformInterceptor());

  await nestApp.init();

  cachedHandler = serverlessExpress({ app: expressApp });
  return cachedHandler;
}

export default async (req: any, res: any) => {
  const handler = await bootstrap();
  return handler(req, res);
};
