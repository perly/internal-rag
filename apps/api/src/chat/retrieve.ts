import type { ChunkSearchRow } from '../repo/chunk.repo.js';

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

export const retrieve = (vectorHits: ChunkSearchRow[], keywordHits: ChunkSearchRow[]): RetrievedChunk[] => {
  return fuse(vectorHits.map(normalize), keywordHits.map(normalize));
};

const normalize = (row: ChunkSearchRow): RetrievedChunk => {
  return { ...row, similarity: Number(row.similarity) };
};

const fuse = (vectorHits: RetrievedChunk[], keywordHits: RetrievedChunk[]): RetrievedChunk[] => {
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
};
