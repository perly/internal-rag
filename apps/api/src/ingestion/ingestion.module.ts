import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module.js';
import { IngestionService } from './ingestion.service.js';
import { OpenAiEmbedder } from './openai-embedder.js';

@Module({
  imports: [RepoModule],
  providers: [IngestionService, OpenAiEmbedder],
  exports: [IngestionService, OpenAiEmbedder],
})
export class IngestionModule {}
