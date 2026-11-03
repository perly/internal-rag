import { Injectable } from '@nestjs/common';
import { toVectorLiteral } from '../ingestion/embedder.js';
import { OpenAiEmbedder } from '../ingestion/openai-embedder.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OpenAiCompleter } from './openai-completer.js';
import { buildMessages, NO_CONTEXT_ANSWER } from './prompt.js';
import { retrieve } from './retrieve.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedder: OpenAiEmbedder,
    private readonly completer: OpenAiCompleter,
  ) {}

  async ask(question: string) {
    const trimmed = question.trim();
    const [vector] = await this.embedder.embed([trimmed]);
    if (!vector) throw new Error('Embedder returned no vector for the question.');

    const hits = await retrieve(this.prisma, trimmed, toVectorLiteral(vector));
    if (hits.length === 0) {
      await this.save(trimmed, NO_CONTEXT_ANSWER, [], false);
      return { answer: NO_CONTEXT_ANSWER, usedModel: false, citations: [] };
    }

    const answer = await this.completer.complete(buildMessages(trimmed, hits));
    await this.save(
      trimmed,
      answer,
      hits.map((hit) => hit.id),
      true,
    );
    return {
      answer,
      usedModel: true,
      citations: hits.map((hit) => ({
        chunkId: hit.id,
        documentId: hit.documentId,
        documentTitle: hit.documentTitle,
        sourceUrl: hit.sourceUrl,
        text: hit.text,
        similarity: hit.similarity,
      })),
    };
  }

  private save(question: string, answer: string, citedChunkIds: string[], usedModel: boolean) {
    return this.prisma.chatMessage.create({
      data: { question, answer, citedChunkIds, usedModel },
    });
  }
}
