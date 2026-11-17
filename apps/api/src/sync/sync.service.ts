import { BadRequestException, Injectable } from '@nestjs/common';
import { driveFileText, getDriveFile, listSelectableDriveFiles } from '../connections/gdrive.client.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { contentHash } from '../helper/index-document.helper.js';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { ChunkRepo } from '../repo/chunk.repo.js';
import { DocumentRepo } from '../repo/document.repo.js';

interface DriveFileSave {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly documentRepo: DocumentRepo,
    private readonly chunkRepo: ChunkRepo,
    private readonly ingestionService: IngestionService,
    private readonly connectionsService: ConnectionsService,
  ) {}

  async availableFiles(connectionId: string) {
    const token = await this.connectionsService.token(connectionId);
    const files = await listSelectableDriveFiles(token);
    const stored = new Set((await this.documentRepo.externalIds(connectionId)).map((row) => row.externalId));
    return files.filter((file) => !stored.has(file.id));
  }

  async importFiles(connectionId: string, fileIds: string[]) {
    const token = await this.connectionsService.token(connectionId);
    const stored = new Set((await this.documentRepo.externalIds(connectionId)).map((row) => row.externalId));
    let imported = 0;
    for (const fileId of fileIds) {
      if (stored.has(fileId)) continue;
      const file = await getDriveFile(token, fileId);
      await this.saveFile(connectionId, token, file);
      imported += 1;
    }
    return { imported };
  }

  async refreshDocument(id: string) {
    const document = await this.documentRepo.findForRefresh(id);
    if (!document || document.origin !== 'gdrive' || !document.connectionId || !document.externalId) {
      throw new BadRequestException('This document is not from Google Drive.');
    }
    const token = await this.connectionsService.token(document.connectionId);
    const file = await getDriveFile(token, document.externalId);
    await this.saveFile(document.connectionId, token, file);
    const view = await this.documentRepo.find(id);
    if (!view) throw new BadRequestException('This document is not from Google Drive.');
    return view;
  }

  private saveFile = async (connectionId: string, token: string, file: DriveFileSave) => {
    const text = await driveFileText(token, { externalId: file.id, mimeType: file.mimeType });
    if (text === null) return;
    const normalized = text.replace(/\s+/g, ' ').trim();
    const hash = contentHash(normalized);
    const existing = await this.documentRepo.findByExternal(connectionId, file.id);
    if (existing && existing.contentHash === hash && existing.status === 'active') {
      await this.documentRepo.markSynced(existing.id);
      return;
    }

    if (!existing) {
      const document = await this.documentRepo.createSynced({
        title: file.name,
        body: text,
        sourceUrl: file.webViewLink,
        contentHash: hash,
        status: normalized ? 'active' : 'error',
        connectionId,
        externalId: file.id,
      });
      if (normalized) await this.ingestionService.index(document);
      return;
    }

    await this.documentRepo.update(existing.id, {
      title: file.name,
      body: text,
      sourceUrl: file.webViewLink,
      contentHash: hash,
      status: normalized ? 'active' : 'error',
      syncedAt: new Date(),
    });
    if (normalized) await this.ingestionService.index({ id: existing.id, body: text });
    else await this.chunkRepo.deleteByDocument(existing.id);
  };
}
