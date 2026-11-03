import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service.js';
import { OpenAiEmbedder } from './openai-embedder.js';

@Module({
  providers: [IngestionService, OpenAiEmbedder],
  exports: [IngestionService],
})
export class IngestionModule {}
