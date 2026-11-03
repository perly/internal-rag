export const EMBEDDING_DIMENSIONS = 1536;

export type Embedder = (inputs: string[]) => Promise<number[][]>;

export function toVectorLiteral(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${values.length}.`);
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Embedding values must be finite numbers.');
  }
  return `[${values.join(',')}]`;
}
