const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const messageFrom = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!body?.message) return 'The request failed.';
  return Array.isArray(body.message) ? body.message.join(' ') : body.message;
};

export const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiUrl}${path}`, init);
  if (!response.ok) throw new Error(await messageFrom(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};
