import { Injectable } from '@nestjs/common';
import { chunkText } from '../helper/chunk.helper.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChunkRepo } from '../repo/chunk.repo.js';
import { DocumentRepo } from '../repo/document.repo.js';
import { embeddingsFor, fillEmbeddings, planChunks, type IndexResult } from '../helper/index-document.helper.js';
import { OpenAiEmbedder } from './openai-embedder.js';

@Injectable()
export class IngestionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly documentRepo: DocumentRepo,
    private readonly chunkRepo: ChunkRepo,
    private readonly openAiEmbedder: OpenAiEmbedder,
  ) {}

  async index(document: { id: string; body: string }): Promise<IndexResult> {
    const pieces = chunkText(document.body);
    if (pieces.length === 0) return this.markEmpty(document.id);

    const planned = planChunks(document.id, pieces);
    const existing = await this.chunkRepo.findByDocument(document.id);
    const existingById = new Map(existing.map((row) => [row.id, row]));
    const { embeddings, toEmbed, toEmbedAt } = embeddingsFor(planned, existingById);
    await fillEmbeddings(this.openAiEmbedder.embed, embeddings, toEmbed, toEmbedAt);
    await this.prismaService.$transaction(async (tx) => {
      await this.chunkRepo.replaceForDocument(document.id, planned, embeddings, tx);
      await this.documentRepo.setStatus(document.id, 'active', tx);
    });

    return {
      chunks: planned.length,
      embedded: toEmbed.length,
      reused: planned.length - toEmbed.length,
    };
  }

  private async markEmpty(documentId: string): Promise<IndexResult> {
    await this.prismaService.$transaction(async (tx) => {
      await this.chunkRepo.deleteByDocument(documentId, tx);
      await this.documentRepo.setStatus(documentId, 'error', tx);
    });
    return { chunks: 0, embedded: 0, reused: 0 };
  }
}
