import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptSecret, encryptSecret, readState, signState } from '../helper/secret.helper.js';
import { ConnectionRepo } from '../repo/connection.repo.js';
import {
  type DriveCredentials,
  exchangeGoogleCode,
  googleAccessToken,
  googleAuthUrl,
  listDriveFolders,
} from './gdrive.client.js';

@Injectable()
export class ConnectionsService {
  constructor(private readonly connectionRepo: ConnectionRepo) {}

  list() {
    return this.connectionRepo.list();
  }

  startUrl(displayName: string): string {
    const name = displayName.trim() || 'Google Drive';
    if (name.length > 200) throw new BadRequestException('Name is too long.');
    try {
      const state = signState(JSON.stringify({ displayName: name, exp: Date.now() + 10 * 60 * 1000 }));
      return googleAuthUrl(state);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Google Drive is not configured.');
    }
  }

  async connect(code: string, state: string) {
    const payload = JSON.parse(readState(state)) as { displayName: string; exp: number };
    if (!payload.displayName || payload.exp < Date.now()) throw new BadRequestException('Connect link expired.');
    const credentials = await exchangeGoogleCode(code);
    return this.connectionRepo.create({
      displayName: payload.displayName,
      credentials: encryptSecret(JSON.stringify(credentials)),
    });
  }

  async folders(id: string) {
    const { token } = await this.token(id);
    return listDriveFolders(token);
  }

  async chooseFolder(id: string, folderId: string) {
    const connection = await this.connectionRepo.find(id);
    if (!connection) throw new NotFoundException('Connection not found.');
    return this.connectionRepo.setFolder(id, folderId.trim());
  }

  async token(id: string): Promise<{ token: string; folderId: string | null; cursor: string | null }> {
    const connection = await this.connectionRepo.find(id);
    if (!connection) throw new NotFoundException('Connection not found.');
    const stored = JSON.parse(decryptSecret(connection.credentials)) as DriveCredentials;
    const access = await googleAccessToken(stored);
    if (access.credentials.accessToken !== stored.accessToken) {
      await this.connectionRepo.saveCredentials(id, encryptSecret(JSON.stringify(access.credentials)));
    }
    return { token: access.token, folderId: connection.folderId, cursor: connection.cursor };
  }
}
