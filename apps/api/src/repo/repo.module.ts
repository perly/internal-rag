import { Module } from '@nestjs/common';
import { ChatMessageRepo } from './chat-message.repo.js';
import { ChunkRepo } from './chunk.repo.js';
import { DocumentRepo } from './document.repo.js';

@Module({
  providers: [DocumentRepo, ChunkRepo, ChatMessageRepo],
  exports: [DocumentRepo, ChunkRepo, ChatMessageRepo],
})
export class RepoModule {}
