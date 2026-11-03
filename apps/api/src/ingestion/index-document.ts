import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { CHUNK_OPTIONS, chunkText } from './chunk.js';
import { type Embedder, toVectorLiteral } from './embedder.js';

export interface IndexResult {
  chunks: number;
  embedded: number;
  reused: number;
}

type Db = PrismaClient | Prisma.TransactionClient;

interface ExistingChunk {
  id: string;
  contentHash: string;
  embedding: string;
}

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function indexDocument(
  prisma: PrismaClient,
  embed: Embedder,
  documentId: string,
): Promise<IndexResult> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new Error('Document not found.');

  const pieces = chunkText(document.body, CHUNK_OPTIONS);
  const normalized = pieces.length === 0 ? '' : document.body.replace(/\s+/g, ' ').trim();
  const documentHash = contentHash(normalized);

  if (pieces.length === 0) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM chunks WHERE "documentId" = ${documentId}`;
      await tx.document.update({
        where: { id: documentId },
        data: { contentHash: documentHash, status: 'error' },
      });
    });
    return { chunks: 0, embedded: 0, reused: 0 };
  }

  const planned = pieces.map((text, chunkIndex) => ({
    id: `${documentId}:${chunkIndex}`,
    chunkIndex,
    text,
    contentHash: contentHash(text),
  }));

  const existing = await prisma.$queryRaw<ExistingChunk[]>`
    SELECT id, "contentHash", embedding::text AS embedding
    FROM chunks
    WHERE "documentId" = ${documentId}
  `;
  const existingById = new Map(existing.map((row) => [row.id, row]));

  const embeddings: Array<string | undefined> = new Array(planned.length);
  const toEmbed: string[] = [];
  const toEmbedAt: number[] = [];

  for (let index = 0; index < planned.length; index += 1) {
    const previous = existingById.get(planned[index].id);
    if (previous && previous.contentHash === planned[index].contentHash) {
      embeddings[index] = previous.embedding;
    } else {
      toEmbed.push(planned[index].text);
      toEmbedAt.push(index);
    }
  }

  if (toEmbed.length > 0) {
    const fresh = await embed(toEmbed);
    if (fresh.length !== toEmbed.length) {
      throw new Error(`Embedder returned ${fresh.length} vectors for ${toEmbed.length} inputs.`);
    }
    toEmbedAt.forEach((chunkIndex, freshIndex) => {
      embeddings[chunkIndex] = toVectorLiteral(fresh[freshIndex]);
    });
  }

  await prisma.$transaction(async (tx) => {
    await replaceChunks(tx, documentId, planned, embeddings);
    await tx.document.update({
      where: { id: documentId },
      data: { contentHash: documentHash, status: 'active' },
    });
  });

  return {
    chunks: planned.length,
    embedded: toEmbed.length,
    reused: planned.length - toEmbed.length,
  };
}

async function replaceChunks(
  tx: Db,
  documentId: string,
  planned: Array<{ id: string; chunkIndex: number; text: string; contentHash: string }>,
  embeddings: Array<string | undefined>,
): Promise<void> {
  await tx.$executeRaw`DELETE FROM chunks WHERE "documentId" = ${documentId}`;
  for (let index = 0; index < planned.length; index += 1) {
    const chunk = planned[index];
    const embedding = embeddings[index];
    if (!embedding) throw new Error(`Missing embedding for ${chunk.id}.`);
    await tx.$executeRaw`
      INSERT INTO chunks (id, "documentId", "chunkIndex", text, "contentHash", embedding)
      VALUES (
        ${chunk.id},
        ${documentId},
        ${chunk.chunkIndex},
        ${chunk.text},
        ${chunk.contentHash},
        CAST(${embedding} AS vector)
      )
    `;
  }
}
