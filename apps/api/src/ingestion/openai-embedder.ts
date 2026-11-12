import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { EMBEDDING_DIMENSIONS, MissingApiKeyError, type Embedder } from '../helper/embedder.helper.js';

export const EMBEDDING_MODEL = 'text-embedding-3-small';

@Injectable()
export class OpenAiEmbedder {
  readonly embed: Embedder = async (inputs) => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new MissingApiKeyError();
    if (inputs.length === 0) return [];

    const client = new OpenAI({ apiKey });
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputs,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return [...response.data]
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
  };
}
