import { Module } from '@nestjs/common';
import { IngestionModule } from '../ingestion/ingestion.module.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [IngestionModule],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
