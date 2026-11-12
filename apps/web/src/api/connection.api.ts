import { apiUrl, request } from './client';

export interface ConnectionSummary {
  id: string;
  provider: 'gdrive';
  displayName: string;
  folderId: string | null;
  lastSyncAt: string | null;
  status: 'active' | 'error';
  syncRuns: Array<{
    status: 'running' | 'success' | 'error';
    finishedAt: string | null;
    createdCount: number;
    updatedCount: number;
    deletedCount: number;
    error: string | null;
  }>;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export const listConnections = (): Promise<ConnectionSummary[]> => request('/api/connections');

export const googleDriveUrl = (displayName: string): Promise<{ url: string }> =>
  request(`/api/connections/gdrive/start?displayName=${encodeURIComponent(displayName)}`);

export const listFolders = (id: string): Promise<DriveFolder[]> => request(`/api/connections/${id}/folders`);

export const chooseFolder = (id: string, folderId: string): Promise<ConnectionSummary> =>
  request(`/api/connections/${id}/folder`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ folderId }),
  });

export const syncConnection = (
  id: string,
): Promise<{ skipped: boolean; created?: number; updated?: number; deleted?: number }> =>
  request(`/api/connections/${id}/sync`, { method: 'POST' });

export const openGoogleDrive = async (displayName: string): Promise<void> => {
  const started = await googleDriveUrl(displayName);
  window.location.href = started.url.startsWith('http') ? started.url : `${apiUrl}${started.url}`;
};
