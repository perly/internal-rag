import { Module } from '@nestjs/common';
import { ChatMessageRepo } from './chat-message.repo.js';
import { ChunkRepo } from './chunk.repo.js';
import { ConnectionRepo } from './connection.repo.js';
import { DocumentRepo } from './document.repo.js';
import { SyncRunRepo } from './sync-run.repo.js';

@Module({
  providers: [DocumentRepo, ChunkRepo, ChatMessageRepo, ConnectionRepo, SyncRunRepo],
  exports: [DocumentRepo, ChunkRepo, ChatMessageRepo, ConnectionRepo, SyncRunRepo],
})
export class RepoModule {}
