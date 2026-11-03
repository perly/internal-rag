import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Document } from '@prisma/client';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { contentHash } from '../ingestion/index-document.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
  ) {}

  async list(): Promise<DocumentSummary[]> {
    return this.prisma.document.findMany({
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(id: string): Promise<DocumentView> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { id: true, title: true, body: true, sourceUrl: true, status: true, updatedAt: true },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return document;
  }

  async save(input: SaveDocumentInput) {
    const title = input.title.trim();
    if (!title) throw new BadRequestException('Title is required.');

    const normalized = input.body.replace(/\s+/g, ' ').trim();
    const document = await this.prisma.document.create({
      data: {
        title,
        body: input.body,
        sourceUrl: input.sourceUrl ?? null,
        contentHash: contentHash(normalized),
        status: normalized ? 'active' : 'error',
      },
    });

    if (!normalized) {
      return { document: await this.get(document.id), chunks: 0, embedded: 0, reused: 0 };
    }

    try {
      const indexed = await this.ingestion.index(document.id);
      return { document: await this.get(document.id), ...indexed };
    } catch (error) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: { status: 'error' },
      });
      throw error;
    }
  }

  async update(id: string, input: { title: string; body: string }) {
    await this.get(id);
    const title = input.title.trim();
    if (!title) throw new BadRequestException('Title is required.');

    const normalized = input.body.replace(/\s+/g, ' ').trim();
    await this.prisma.document.update({
      where: { id },
      data: {
        title,
        body: input.body,
        contentHash: contentHash(normalized),
        status: normalized ? 'active' : 'error',
      },
    });

    const indexed = await this.ingestion.index(id);
    return { document: await this.get(id), ...indexed };
  }

  async remove(id: string): Promise<void> {
    const result = await this.prisma.document.deleteMany({ where: { id } });
    if (result.count === 0) throw new NotFoundException('Document not found.');
  }
}
