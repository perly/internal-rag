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

export interface DriveFileText {
  externalId: string;
  mimeType: string;
}

interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
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

const READABLE = [
  "mimeType = 'application/vnd.google-apps.document'",
  "mimeType = 'application/pdf'",
  "mimeType = 'text/plain'",
  "mimeType = 'text/markdown'",
].join(' or ');

export interface DriveFileChoice {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
}

export const listSelectableDriveFiles = async (token: string): Promise<DriveFileChoice[]> => {
  const items: DriveFileChoice[] = [];
  let pageToken = '';
  const query = encodeURIComponent(`trashed = false and (${READABLE})`);
  do {
    const paging = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const response = await driveGet(
      token,
      `/files?q=${query}&pageSize=100&orderBy=name&fields=nextPageToken,files(id,name,mimeType,webViewLink)${paging}`,
    );
    const body = (await response.json()) as { nextPageToken?: string; files?: DriveFile[] };
    items.push(
      ...(body.files ?? []).map((file) => ({
        id: file.id,
        name: file.name ?? 'Untitled',
        mimeType: file.mimeType ?? '',
        webViewLink: file.webViewLink ?? null,
      })),
    );
    pageToken = body.nextPageToken ?? '';
  } while (pageToken && items.length < 500);
  return items;
};

export const getDriveFile = async (token: string, fileId: string): Promise<DriveFileChoice & { modifiedTime: string | null }> => {
  const response = await driveGet(
    token,
    `/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,webViewLink,trashed,modifiedTime`,
  );
  const file = (await response.json()) as DriveFile;
  if (file.trashed) throw new Error('That Google file is in the trash.');
  return {
    id: file.id,
    name: file.name ?? 'Untitled',
    mimeType: file.mimeType ?? '',
    webViewLink: file.webViewLink ?? null,
    modifiedTime: file.modifiedTime ?? null,
  };
};

export const driveFileText = async (token: string, file: DriveFileText): Promise<string | null> => {
  if (file.mimeType === DOC) {
    const response = await driveGet(token, `/files/${file.externalId}/export?mimeType=text/plain`);
    return textFromBytes(Buffer.from(await response.arrayBuffer()));
  }
  if (file.mimeType === PDF) {
    const response = await driveGet(token, `/files/${file.externalId}?alt=media`);
    return textFromPdf(await limitedBytes(response));
  }
  if (!TEXT.has(file.mimeType)) return null;
  const response = await driveGet(token, `/files/${file.externalId}?alt=media`);
  return textFromBytes(await limitedBytes(response));
};

const limitedBytes = async (response: Response): Promise<Buffer> => {
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) throw new Error('File is larger than 5 MB.');
  return bytes;
};

const textFromBytes = (bytes: Buffer): string => bytes.toString('utf8');
