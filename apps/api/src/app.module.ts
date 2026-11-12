import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module.js';
import { ConnectionsModule } from './connections/connections.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SyncModule } from './sync/sync.module.js';

@Module({
  imports: [PrismaModule, HealthModule, DocumentsModule, ChatModule, ConnectionsModule, SyncModule],
})
export class AppModule {}
