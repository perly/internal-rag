import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const publicSelect = {
  id: true,
  provider: true,
  displayName: true,
  folderId: true,
  lastSyncAt: true,
  status: true,
} as const;

@Injectable()
export class ConnectionRepo {
  constructor(private readonly prismaService: PrismaService) {}

  list() {
    return this.prismaService.connection.findMany({
      select: {
        ...publicSelect,
        syncRuns: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { status: true, finishedAt: true, createdCount: true, updatedCount: true, deletedCount: true, error: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  find(id: string) {
    return this.prismaService.connection.findUnique({ where: { id } });
  }

  idsToSync() {
    return this.prismaService.connection.findMany({
      where: { folderId: { not: null } },
      select: { id: true },
    });
  }

  create(data: { displayName: string; credentials: string }) {
    return this.prismaService.connection.create({
      data: { provider: 'gdrive', displayName: data.displayName, credentials: data.credentials },
      select: publicSelect,
    });
  }

  setFolder(id: string, folderId: string) {
    return this.prismaService.connection.update({
      where: { id },
      data: { folderId, cursor: null },
      select: publicSelect,
    });
  }

  saveCredentials(id: string, credentials: string) {
    return this.prismaService.connection.update({ where: { id }, data: { credentials } });
  }

  finishSync(id: string, data: Prisma.ConnectionUpdateInput) {
    return this.prismaService.connection.update({ where: { id }, data });
  }
}
