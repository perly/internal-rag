import { request } from './client';

export interface DocumentSummary {
  id: string;
  title: string;
  status: 'active' | 'deleted' | 'error';
  origin: 'manual' | 'gdrive';
  updatedAt: string;
}

export interface DocumentView extends DocumentSummary {
  body: string;
  sourceUrl: string | null;
}

export interface SaveResult {
  document: DocumentView;
  chunks: number;
  embedded: number;
  reused: number;
}

export const listDocuments = (): Promise<DocumentSummary[]> => request('/api/documents');

export const getDocument = (id: string): Promise<DocumentView> => request(`/api/documents/${id}`);

export const createDocument = (input: {
  title: string;
  body: string;
  sourceUrl: string;
  file: File | null;
}): Promise<SaveResult> => {
  if (input.file) {
    const form = new FormData();
    form.set('title', input.title);
    if (input.sourceUrl) form.set('sourceUrl', input.sourceUrl);
    form.set('file', input.file);
    return request('/api/documents', { method: 'POST', body: form });
  }
  return request('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    }),
  });
};

export const updateDocument = (id: string, input: { title: string; body: string }): Promise<SaveResult> =>
  request(`/api/documents/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

export const deleteDocument = (id: string): Promise<void> => request(`/api/documents/${id}`, { method: 'DELETE' });
