import { textFromPdf } from '../helper/extract-text.helper.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const READONLY = 'https://www.googleapis.com/auth/drive.readonly';
const DOC = 'application/vnd.google-apps.document';
const PDF = 'application/pdf';
const TEXT = new Set(['text/plain', 'text/markdown']);

export interface DriveCredentials {
  refreshToken: string;
  accessToken: string;
  accessTokenExpiresAt: number;
}

export interface DriveChange {
  externalId: string;
  removed: boolean;
  inFolder: boolean;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  modifiedTime: string | null;
}

export interface DriveFolder {
  id: string;
  name: string;
}

interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  parents?: string[];
  trashed?: boolean;
  webViewLink?: string;
  modifiedTime?: string;
}

const googleConfig = (): { clientId: string; clientSecret: string; redirectUri: string } => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() ?? '';
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Drive is not configured.');
  }
  return { clientId, clientSecret, redirectUri };
};

const driveError = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string } | string;
    error_description?: string;
  } | null;
  if (body?.error && typeof body.error === 'object' && body.error.message) return body.error.message;
  if (typeof body?.error === 'string') return body.error_description ?? body.error;
  return 'Google Drive request failed.';
};

export const googleAuthUrl = (state: string): string => {
  const { clientId, redirectUri } = googleConfig();
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', READONLY);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
};

const tokenRequest = async (body: URLSearchParams): Promise<DriveCredentials & { refreshToken: string }> => {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('redirect_uri', redirectUri);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(await driveError(response));
  const token = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  return {
    refreshToken: token.refresh_token ?? '',
    accessToken: token.access_token,
    accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
  };
};

export const exchangeGoogleCode = async (code: string): Promise<DriveCredentials> => {
  const body = new URLSearchParams({ code, grant_type: 'authorization_code' });
  const credentials = await tokenRequest(body);
  if (!credentials.refreshToken) throw new Error('Google did not return a refresh token.');
  return credentials;
};

export const refreshGoogleAccess = async (credentials: DriveCredentials): Promise<DriveCredentials> => {
  const body = new URLSearchParams({ refresh_token: credentials.refreshToken, grant_type: 'refresh_token' });
  const refreshed = await tokenRequest(body);
  return { ...refreshed, refreshToken: credentials.refreshToken };
};

export const googleAccessToken = async (
  credentials: DriveCredentials,
): Promise<{ token: string; credentials: DriveCredentials }> => {
  if (credentials.accessTokenExpiresAt > Date.now() + 60_000) {
    return { token: credentials.accessToken, credentials };
  }
  const refreshed = await refreshGoogleAccess(credentials);
  return { token: refreshed.accessToken, credentials: refreshed };
};

const driveGet = async (token: string, path: string): Promise<Response> => {
  const response = await fetch(`${DRIVE}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(await driveError(response));
  return response;
};

export const listDriveFolders = async (token: string): Promise<DriveFolder[]> => {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const response = await driveGet(token, `/files?q=${query}&pageSize=100&fields=files(id,name)`);
  const body = (await response.json()) as { files?: DriveFolder[] };
  return body.files ?? [];
};

const fileChange = (file: DriveFile, folderId: string): DriveChange => ({
  externalId: file.id,
  removed: Boolean(file.trashed),
  inFolder: file.parents?.includes(folderId) ?? false,
  name: file.name ?? 'Untitled',
  mimeType: file.mimeType ?? '',
  webViewLink: file.webViewLink ?? null,
  modifiedTime: file.modifiedTime ?? null,
});

export const listFolderChanges = async (token: string, folderId: string): Promise<DriveChange[]> => {
  const items: DriveChange[] = [];
  let pageToken = '';
  const query = encodeURIComponent(`'${folderId.replaceAll("'", "\\'")}' in parents and trashed = false`);
  do {
    const paging = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const response = await driveGet(
      token,
      `/files?q=${query}&pageSize=100&fields=nextPageToken,files(id,name,mimeType,parents,trashed,webViewLink,modifiedTime)${paging}`,
    );
    const body = (await response.json()) as { nextPageToken?: string; files?: DriveFile[] };
    items.push(...(body.files ?? []).map((file) => fileChange(file, folderId)));
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return items;
};

export const driveStartToken = async (token: string): Promise<string> => {
  const response = await driveGet(token, '/changes/startPageToken');
  const body = (await response.json()) as { startPageToken: string };
  return body.startPageToken;
};

export const listDriveChanges = async (token: string, folderId: string, cursor: string): Promise<{
  items: DriveChange[];
  nextCursor: string;
}> => {
  const items: DriveChange[] = [];
  let pageToken = cursor;
  let nextCursor = cursor;
  do {
    const response = await driveGet(
      token,
      `/changes?pageToken=${encodeURIComponent(pageToken)}&pageSize=100&fields=nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,parents,trashed,webViewLink,modifiedTime))`,
    );
    const body = (await response.json()) as {
      nextPageToken?: string;
      newStartPageToken?: string;
      changes?: Array<{ fileId: string; removed?: boolean; file?: DriveFile }>;
    };
    for (const change of body.changes ?? []) {
      if (change.removed || !change.file) {
        items.push({
          externalId: change.fileId,
          removed: true,
          inFolder: false,
          name: '',
          mimeType: '',
          webViewLink: null,
          modifiedTime: null,
        });
        continue;
      }
      items.push(fileChange({ ...change.file, id: change.file.id || change.fileId }, folderId));
    }
    if (body.newStartPageToken) nextCursor = body.newStartPageToken;
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return { items, nextCursor };
};

export const driveFileText = async (token: string, change: DriveChange): Promise<string | null> => {
  if (change.mimeType === DOC) {
    const response = await driveGet(token, `/files/${change.externalId}/export?mimeType=text/plain`);
    return textFromBytes(Buffer.from(await response.arrayBuffer()));
  }
  if (change.mimeType === PDF) {
    const response = await driveGet(token, `/files/${change.externalId}?alt=media`);
    return textFromPdf(await limitedBytes(response));
  }
  if (!TEXT.has(change.mimeType)) return null;
  const response = await driveGet(token, `/files/${change.externalId}?alt=media`);
  return textFromBytes(await limitedBytes(response));
};

const limitedBytes = async (response: Response): Promise<Buffer> => {
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error('File is larger than 5 MB.');
  return bytes;
};

const textFromBytes = (bytes: Buffer): string => bytes.toString('utf8');
