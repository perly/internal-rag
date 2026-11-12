import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaClient | Prisma.TransactionClient;

const VECTOR_LIMIT = 20;
const KEYWORD_LIMIT = 20;
const MIN_SIMILARITY = 0.35;

export interface StoredChunk {
  id: string;
  contentHash: string;
  embedding: string;
}

export interface ChunkInsert {
  id: string;
  chunkIndex: number;
  text: string;
  contentHash: string;
}

export interface ChunkSearchRow {
  id: string;
  documentId: string;
  documentTitle: string;
  sourceUrl: string | null;
  text: string;
  similarity: number;
}

@Injectable()
export class ChunkRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findByDocument(documentId: string): Promise<StoredChunk[]> {
    return this.prismaService.$queryRaw<StoredChunk[]>`
      SELECT id, "contentHash", embedding::text AS embedding
      FROM chunks
      WHERE "documentId" = ${documentId}
    `;
  }

  async deleteByDocument(documentId: string, db: Db = this.prismaService): Promise<void> {
    await db.$executeRaw`DELETE FROM chunks WHERE "documentId" = ${documentId}`;
  }

  async replaceForDocument(
    documentId: string,
    planned: ChunkInsert[],
    embeddings: Array<string | undefined>,
    db: Db = this.prismaService,
  ): Promise<void> {
    await this.deleteByDocument(documentId, db);
    for (let index = 0; index < planned.length; index += 1) {
      const chunk = planned[index];
      const embedding = embeddings[index];
      if (!embedding) throw new Error(`Missing embedding for ${chunk.id}.`);
      await db.$executeRaw`
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

  searchByVector(vectorLiteral: string): Promise<ChunkSearchRow[]> {
    return this.prismaService.$queryRaw<ChunkSearchRow[]>`
      SELECT
        c.id,
        c."documentId",
        d.title AS "documentTitle",
        d."sourceUrl" AS "sourceUrl",
        c.text,
        (1 - (c.embedding <=> CAST(${vectorLiteral} AS vector)))::float8 AS similarity
      FROM chunks c
      JOIN documents d ON d.id = c."documentId"
      WHERE d.status = 'active'
        AND (1 - (c.embedding <=> CAST(${vectorLiteral} AS vector))) >= ${MIN_SIMILARITY}
      ORDER BY c.embedding <=> CAST(${vectorLiteral} AS vector)
      LIMIT ${VECTOR_LIMIT}
    `;
  }

  searchByKeyword(question: string, vectorLiteral: string): Promise<ChunkSearchRow[]> {
    return this.prismaService.$queryRaw<ChunkSearchRow[]>`
      SELECT
        c.id,
        c."documentId",
        d.title AS "documentTitle",
        d."sourceUrl" AS "sourceUrl",
        c.text,
        (1 - (c.embedding <=> CAST(${vectorLiteral} AS vector)))::float8 AS similarity
      FROM chunks c
      JOIN documents d ON d.id = c."documentId"
      WHERE d.status = 'active'
        AND c."searchText" @@ plainto_tsquery('english', ${question})
      ORDER BY ts_rank(c."searchText", plainto_tsquery('english', ${question})) DESC
      LIMIT ${KEYWORD_LIMIT}
    `;
  }
}
