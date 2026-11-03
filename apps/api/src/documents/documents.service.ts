import { Injectable } from '@nestjs/common';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { contentHash } from '../ingestion/index-document.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface SaveDocumentInput {
  title: string;
  body: string;
  sourceUrl?: string | null;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
  ) {}

  async save(input: SaveDocumentInput) {
    const title = input.title.trim();
    if (!title) throw new Error('Title is required.');

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

    if (!normalized) return { document, chunks: 0, embedded: 0, reused: 0 };

    try {
      const indexed = await this.ingestion.index(document.id);
      return { document, ...indexed };
    } catch (error) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: { status: 'error' },
      });
      throw error;
    }
  }
}
