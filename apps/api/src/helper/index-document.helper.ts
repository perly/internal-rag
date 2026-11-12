import { createHash } from 'node:crypto';
import { type Embedder, toVectorLiteral } from './embedder.helper.js';

export interface IndexResult {
  chunks: number;
  embedded: number;
  reused: number;
}

interface ExistingChunk {
  id: string;
  contentHash: string;
  embedding: string;
}

interface PlannedChunk {
  id: string;
  chunkIndex: number;
  text: string;
  contentHash: string;
}

export const contentHash = (text: string): string => {
  return createHash('sha256').update(text).digest('hex');
};

export const planChunks = (documentId: string, pieces: string[]): PlannedChunk[] => {
  return pieces.map((text, chunkIndex) => ({
    id: `${documentId}:${chunkIndex}`,
    chunkIndex,
    text,
    contentHash: contentHash(text),
  }));
};

export const embeddingsFor = (
  planned: PlannedChunk[],
  existingById: Map<string, ExistingChunk>,
): { embeddings: Array<string | undefined>; toEmbed: string[]; toEmbedAt: number[] } => {
  const embeddings: Array<string | undefined> = new Array(planned.length);
  const toEmbed: string[] = [];
  const toEmbedAt: number[] = [];

  planned.forEach((chunk, index) => {
    const previous = existingById.get(chunk.id);
    if (previous && previous.contentHash === chunk.contentHash) {
      embeddings[index] = previous.embedding;
      return;
    }
    toEmbed.push(chunk.text);
    toEmbedAt.push(index);
  });

  return { embeddings, toEmbed, toEmbedAt };
};

export const fillEmbeddings = async (
  embed: Embedder,
  embeddings: Array<string | undefined>,
  toEmbed: string[],
  toEmbedAt: number[],
): Promise<void> => {
  if (toEmbed.length === 0) return;
  const fresh = await embed(toEmbed);
  if (fresh.length !== toEmbed.length) {
    throw new Error(`Embedder returned ${fresh.length} vectors for ${toEmbed.length} inputs.`);
  }
  toEmbedAt.forEach((chunkIndex, freshIndex) => {
    embeddings[chunkIndex] = toVectorLiteral(fresh[freshIndex]);
  });
};
