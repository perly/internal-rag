import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type Db = Prisma.TransactionClient;

@Injectable()
export class SyncRunRepo {
  constructor(private readonly prismaService: PrismaService) {}

  findRunning(connectionId: string, db: Db) {
    return db.syncRun.findFirst({
      where: { connectionId, status: 'running' },
      orderBy: { startedAt: 'desc' },
    });
  }

  start(connectionId: string, db: Db) {
    return db.syncRun.create({ data: { connectionId, status: 'running' } });
  }

  finish(id: string, data: Prisma.SyncRunUpdateInput) {
    return this.prismaService.syncRun.update({ where: { id }, data });
  }

  fail(id: string, error: string, db: Db = this.prismaService) {
    return db.syncRun.update({
      where: { id },
      data: { status: 'error', finishedAt: new Date(), error },
    });
  }
}
