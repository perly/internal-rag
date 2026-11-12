import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const key = (): Buffer => {
  const secret = process.env.APP_SECRET?.trim();
  if (!secret) throw new Error('APP_SECRET is required.');
  return scryptSync(secret, 'internal-rag', 32);
};

export const encryptSecret = (plain: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
};

export const decryptSecret = (encoded: string): string => {
  const bytes = Buffer.from(encoded, 'base64url');
  const iv = bytes.subarray(0, 12);
  const tag = bytes.subarray(12, 28);
  const ciphertext = bytes.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

export const signState = (payload: string): string => {
  const body = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', key()).update(body).digest('base64url');
  return `${body}.${signature}`;
};

export const readState = (state: string): string => {
  const [body, signature] = state.split('.');
  if (!body || !signature) throw new Error('Connect link is not valid.');
  const expected = createHmac('sha256', key()).update(body).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error('Connect link is not valid.');
  }
  return Buffer.from(body, 'base64url').toString('utf8');
};
