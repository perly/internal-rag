import { request } from './client';

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceUrl: string | null;
  text: string;
  similarity: number;
}

export interface ChatReply {
  answer: string;
  usedModel: boolean;
  citations: Citation[];
}

export const ask = (question: string): Promise<ChatReply> =>
  request('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
  });
