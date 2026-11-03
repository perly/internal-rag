import type { PrismaClient } from '@prisma/client';

export const VECTOR_LIMIT = 20;
export const KEYWORD_LIMIT = 20;
export const MIN_SIMILARITY = 0.35;
export const ANSWER_LIMIT = 8;
const RRF_K = 60;

export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  sourceUrl: string | null;
  text: string;
  similarity: number;
}

interface RetrievedRow {
  id: string;
  documentId: string;
  documentTitle: string;
  sourceUrl: string | null;
  text: string;
  similarity: number;
}

export async function retrieve(
  prisma: PrismaClient,
  question: string,
  vectorLiteral: string,
): Promise<RetrievedChunk[]> {
  const vectorHits = await prisma.$queryRaw<RetrievedRow[]>`
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

  const keywordHits = await prisma.$queryRaw<RetrievedRow[]>`
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

  return fuse(vectorHits.map(normalize), keywordHits.map(normalize));
}

function normalize(row: RetrievedRow): RetrievedChunk {
  return { ...row, similarity: Number(row.similarity) };
}

function fuse(vectorHits: RetrievedChunk[], keywordHits: RetrievedChunk[]): RetrievedChunk[] {
  const scores = new Map<string, { chunk: RetrievedChunk; score: number }>();

  const add = (chunk: RetrievedChunk, rank: number) => {
    const score = 1 / (RRF_K + rank + 1);
    const current = scores.get(chunk.id);
    if (!current) {
      scores.set(chunk.id, { chunk, score });
      return;
    }
    current.score += score;
    if (chunk.similarity > current.chunk.similarity) {
      current.chunk = { ...current.chunk, similarity: chunk.similarity };
    }
  };

  vectorHits.forEach((chunk, rank) => add(chunk, rank));
  keywordHits.forEach((chunk, rank) => add(chunk, rank));

  return [...scores.values()]
    .sort((left, right) => right.score - left.score || right.chunk.similarity - left.chunk.similarity)
    .slice(0, ANSWER_LIMIT)
    .map((entry) => entry.chunk);
}
