import { Module } from '@nestjs/common';
import { ConnectionsModule } from '../connections/connections.module.js';
import { IngestionModule } from '../ingestion/ingestion.module.js';
import { RepoModule } from '../repo/repo.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [RepoModule, IngestionModule, ConnectionsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
