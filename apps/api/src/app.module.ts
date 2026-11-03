import { Module } from '@nestjs/common';
import { DocumentsModule } from './documents/documents.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, HealthModule, DocumentsModule],
})
export class AppModule {}
