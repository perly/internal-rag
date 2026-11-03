import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { MissingApiKeyFilter, MulterExceptionFilter } from './api-errors.js';

export const MAX_CHAT_BODY_BYTES = 64 * 1024;

export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.use('/api/chat', (request: Request, response: Response, next: NextFunction) => {
    const length = Number(request.header('content-length') ?? 0);
    if (Number.isFinite(length) && length > MAX_CHAT_BODY_BYTES) {
      response.status(413).json({ statusCode: 413, message: 'Question is too large.' });
      return;
    }
    next();
  });
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new MissingApiKeyFilter(), new MulterExceptionFilter());
}
