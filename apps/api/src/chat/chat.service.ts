import { Injectable } from '@nestjs/common';
import { toVectorLiteral } from '../helper/embedder.helper.js';
import { OpenAiEmbedder } from '../ingestion/openai-embedder.js';
import { ChatMessageRepo } from '../repo/chat-message.repo.js';
import { ChunkRepo } from '../repo/chunk.repo.js';
import { OpenAiCompleter } from './openai-completer.js';
import { buildMessages, NO_CONTEXT_ANSWER } from './prompt.js';
import { retrieve } from './retrieve.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly chunkRepo: ChunkRepo,
    private readonly chatMessageRepo: ChatMessageRepo,
    private readonly openAiEmbedder: OpenAiEmbedder,
    private readonly openAiCompleter: OpenAiCompleter,
  ) {}

  async ask(question: string) {
    const [vector] = await this.openAiEmbedder.embed([question]);
    if (!vector) throw new Error('Embedder returned no vector for the question.');

    const vectorLiteral = toVectorLiteral(vector);
    const hits = retrieve(
      await this.chunkRepo.searchByVector(vectorLiteral),
      await this.chunkRepo.searchByKeyword(question, vectorLiteral),
    );
    if (hits.length === 0) {
      await this.save(question, NO_CONTEXT_ANSWER, [], false);
      return { answer: NO_CONTEXT_ANSWER, usedModel: false, citations: [] };
    }

    const answer = await this.openAiCompleter.complete(buildMessages(question, hits));
    await this.save(
      question,
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
    return this.chatMessageRepo.create({ question, answer, citedChunkIds, usedModel });
  }
}
