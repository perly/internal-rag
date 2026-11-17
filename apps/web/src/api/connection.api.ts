import { apiUrl, request } from './client';

export interface ConnectionSummary {
  id: string;
  provider: 'gdrive';
  displayName: string;
  status: 'active' | 'error';
}

export interface DriveFileChoice {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
}

export const listConnections = (): Promise<ConnectionSummary[]> => request('/api/connections');

export const googleDriveUrl = (displayName: string): Promise<{ url: string }> =>
  request(`/api/connections/gdrive/start?displayName=${encodeURIComponent(displayName)}`);

export const listDriveFiles = (id: string): Promise<DriveFileChoice[]> => request(`/api/connections/${id}/files`);

export const importDriveFiles = (id: string, fileIds: string[]): Promise<{ imported: number }> =>
  request(`/api/connections/${id}/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fileIds }),
  });

export const openGoogleDrive = async (displayName: string): Promise<void> => {
  const started = await googleDriveUrl(displayName);
  window.location.href = started.url.startsWith('http') ? started.url : `${apiUrl}${started.url}`;
};
