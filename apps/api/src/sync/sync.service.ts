import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { contentHash } from '../helper/index-document.helper.js';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { ChunkRepo } from '../repo/chunk.repo.js';
import { ConnectionRepo } from '../repo/connection.repo.js';
import { DocumentRepo } from '../repo/document.repo.js';
import { SyncRunRepo } from '../repo/sync-run.repo.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import {
  type DriveChange,
  driveFileText,
  driveStartToken,
  listDriveChanges,
  listFolderChanges,
} from '../connections/gdrive.client.js';

const STALE_MS = 15 * 60 * 1000;

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly connectionRepo: ConnectionRepo,
    private readonly syncRunRepo: SyncRunRepo,
    private readonly documentRepo: DocumentRepo,
    private readonly chunkRepo: ChunkRepo,
    private readonly ingestionService: IngestionService,
    private readonly connectionsService: ConnectionsService,
  ) {}

  onModuleInit(): void {
    const interval = Number(process.env.SYNC_INTERVAL_MS ?? 300_000);
    if (!Number.isFinite(interval) || interval < 1) return;
    this.timer = setInterval(() => {
      void this.syncAll();
    }, interval);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async syncAll(): Promise<void> {
    const connections = await this.connectionRepo.idsToSync();
    for (const connection of connections) {
      await this.sync(connection.id).catch(() => undefined);
    }
  }

  async sync(connectionId: string) {
    const runId = await this.claim(connectionId);
    if (!runId) return { skipped: true };
    try {
      const result = await this.apply(connectionId);
      await this.syncRunRepo.finish(runId, {
        status: 'success',
        finishedAt: new Date(),
        createdCount: result.created,
        updatedCount: result.updated,
        deletedCount: result.deleted,
      });
      await this.connectionRepo.finishSync(connectionId, {
        cursor: result.cursor,
        lastSyncAt: new Date(),
        status: 'active',
      });
      return { skipped: false, created: result.created, updated: result.updated, deleted: result.deleted };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed.';
      await this.syncRunRepo.finish(runId, { status: 'error', finishedAt: new Date(), error: message });
      await this.connectionRepo.finishSync(connectionId, { status: 'error' });
      throw error;
    }
  }

  private claim = async (connectionId: string): Promise<string | null> => {
    return this.prismaService.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM connections WHERE id = ${connectionId} FOR UPDATE`;
      const running = await this.syncRunRepo.findRunning(connectionId, tx);
      if (running && Date.now() - running.startedAt.getTime() < STALE_MS) return null;
      if (running) await this.syncRunRepo.fail(running.id, 'Sync did not finish.', tx);
      const run = await this.syncRunRepo.start(connectionId, tx);
      return run.id;
    });
  };

  private apply = async (connectionId: string) => {
    const access = await this.connectionsService.token(connectionId);
    if (!access.folderId) throw new BadRequestException('Choose a Google Drive folder.');
    const page = await this.changes(access.token, access.folderId, access.cursor);
    const counts = { created: 0, updated: 0, deleted: 0 };
    for (const change of page.items) {
      const outcome = await this.applyChange(connectionId, access.token, change);
      if (outcome === 'created') counts.created += 1;
      if (outcome === 'updated') counts.updated += 1;
      if (outcome === 'deleted') counts.deleted += 1;
    }
    return { ...counts, cursor: page.nextCursor };
  };

  private changes = async (token: string, folderId: string, cursor: string | null) => {
    if (cursor) return listDriveChanges(token, folderId, cursor);
    const nextCursor = await driveStartToken(token);
    const items = await listFolderChanges(token, folderId);
    return { items, nextCursor };
  };

  private applyChange = async (
    connectionId: string,
    token: string,
    change: DriveChange,
  ): Promise<'created' | 'updated' | 'deleted' | 'unchanged'> => {
    const existing = await this.documentRepo.findByExternal(connectionId, change.externalId);
    if (change.removed || !change.inFolder) {
      if (!existing || existing.status === 'deleted') return 'unchanged';
      await this.chunkRepo.deleteByDocument(existing.id);
      await this.documentRepo.setStatus(existing.id, 'deleted');
      return 'deleted';
    }

    const text = await driveFileText(token, change);
    if (text === null) return 'unchanged';
    const normalized = text.replace(/\s+/g, ' ').trim();
    const hash = contentHash(normalized);
    if (existing && existing.contentHash === hash && existing.status === 'active') return 'unchanged';

    if (!existing) {
      const document = await this.documentRepo.createSynced({
        title: change.name,
        body: text,
        sourceUrl: change.webViewLink,
        contentHash: hash,
        status: normalized ? 'active' : 'error',
        connectionId,
        externalId: change.externalId,
      });
      if (normalized) await this.ingestionService.index(document);
      return 'created';
    }

    await this.documentRepo.update(existing.id, {
      title: change.name,
      body: text,
      sourceUrl: change.webViewLink,
      contentHash: hash,
      status: normalized ? 'active' : 'error',
    });
    if (normalized) await this.ingestionService.index({ id: existing.id, body: text });
    else await this.chunkRepo.deleteByDocument(existing.id);
    return 'updated';
  };
}
