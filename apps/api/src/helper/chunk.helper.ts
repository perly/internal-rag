export interface ChunkOptions {
  size: number;
  overlap: number;
}

export const CHUNK_OPTIONS: ChunkOptions = { size: 180, overlap: 40 };

const requireChunkOptions = (options: ChunkOptions): ChunkOptions => {
  const { size, overlap } = options;
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('Chunk size must be a positive integer.');
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
    throw new Error('Chunk overlap must be an integer smaller than the chunk size.');
  }
  return options;
};

const normalizeChunkText = (text: string): string => text.replace(/\s+/g, ' ').trim();

const pieceEnd = (text: string, start: number, size: number): number => {
  const end = Math.min(start + size, text.length);
  if (end >= text.length) return end;
  const breakAt = text.lastIndexOf(' ', end);
  if (breakAt > start + Math.floor(size / 2)) return breakAt;
  return end;
};

const nextStart = (start: number, end: number, overlap: number): number => {
  const next = end - overlap;
  return next > start ? next : end;
};

export const chunkText = (text: string, options: ChunkOptions = CHUNK_OPTIONS): string[] => {
  const { size, overlap } = requireChunkOptions(options);
  const normalized = normalizeChunkText(text);
  if (!normalized) return [];
  if (normalized.length <= size) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = pieceEnd(normalized, start, size);
    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;
    start = nextStart(start, end, overlap);
  }

  return chunks;
};
