import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { indexDocument, type IndexResult } from './index-document.js';
import { OpenAiEmbedder } from './openai-embedder.js';

@Injectable()
export class IngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedder: OpenAiEmbedder,
  ) {}

  index(documentId: string): Promise<IndexResult> {
    return indexDocument(this.prisma, this.embedder.embed, documentId);
  }
}
