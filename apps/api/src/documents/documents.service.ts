import { Injectable, NotFoundException } from '@nestjs/common';
import type { Document } from '@prisma/client';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { contentHash } from '../helper/index-document.helper.js';
import { DocumentRepo } from '../repo/document.repo.js';

export interface SaveDocumentInput {
  title: string;
  body: string;
  sourceUrl?: string | null;
}

export interface DocumentSummary {
  id: string;
  title: string;
  status: Document['status'];
  updatedAt: Date;
}

export interface DocumentView extends DocumentSummary {
  body: string;
  sourceUrl: string | null;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepo: DocumentRepo,
    private readonly ingestionService: IngestionService,
  ) {}

  list(): Promise<DocumentSummary[]> {
    return this.documentRepo.list();
  }

  async get(id: string): Promise<DocumentView> {
    const document = await this.documentRepo.find(id);
    if (!document) throw new NotFoundException('Document not found.');
    return document;
  }

  async save(input: SaveDocumentInput) {
    const normalized = input.body.replace(/\s+/g, ' ').trim();
    const document = await this.documentRepo.create({
      title: input.title,
      body: input.body,
      sourceUrl: input.sourceUrl ?? null,
      contentHash: contentHash(normalized),
      status: normalized ? 'active' : 'error',
    });

    if (!normalized) {
      return { document, chunks: 0, embedded: 0, reused: 0 };
    }

    try {
      const indexed = await this.ingestionService.index(document);
      return { document: await this.get(document.id), ...indexed };
    } catch (error) {
      await this.documentRepo.setStatus(document.id, 'error');
      throw error;
    }
  }

  async update(id: string, input: { title: string; body: string }) {
    await this.get(id);
    const normalized = input.body.replace(/\s+/g, ' ').trim();
    await this.documentRepo.update(id, {
      title: input.title,
      body: input.body,
      contentHash: contentHash(normalized),
      status: normalized ? 'active' : 'error',
    });

    const indexed = await this.ingestionService.index({ id, body: input.body });
    return { document: await this.get(id), ...indexed };
  }

  async remove(id: string): Promise<void> {
    const result = await this.documentRepo.deleteById(id);
    if (result.count === 0) throw new NotFoundException('Document not found.');
  }
}
