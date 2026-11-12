import { Injectable } from '@nestjs/common';
import type { Document, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaClient | Prisma.TransactionClient;

const summarySelect = { id: true, title: true, status: true, origin: true, updatedAt: true } as const;
const viewSelect = { id: true, title: true, body: true, sourceUrl: true, status: true, updatedAt: true } as const;

export interface DocumentWrite {
  title: string;
  body: string;
  contentHash: string;
  status: Document['status'];
}

@Injectable()
export class DocumentRepo {
  constructor(private readonly prismaService: PrismaService) {}

  list() {
    return this.prismaService.document.findMany({
      select: summarySelect,
      orderBy: { updatedAt: 'desc' },
    });
  }

  find(id: string) {
    return this.prismaService.document.findUnique({ where: { id }, select: viewSelect });
  }

  create(data: DocumentWrite & { sourceUrl: string | null }) {
    return this.prismaService.document.create({ data, select: viewSelect });
  }

  update(id: string, data: DocumentWrite & { sourceUrl?: string | null }) {
    return this.prismaService.document.update({ where: { id }, data });
  }

  setStatus(id: string, status: Document['status'], db: Db = this.prismaService) {
    return db.document.update({ where: { id }, data: { status } });
  }

  deleteById(id: string) {
    return this.prismaService.document.deleteMany({ where: { id } });
  }

  findByExternal(connectionId: string, externalId: string) {
    return this.prismaService.document.findUnique({
      where: { connectionId_externalId: { connectionId, externalId } },
      select: { id: true, contentHash: true, status: true },
    });
  }

  createSynced(data: DocumentWrite & { sourceUrl: string | null; connectionId: string; externalId: string }) {
    return this.prismaService.document.create({
      data: { ...data, origin: 'gdrive' },
      select: viewSelect,
    });
  }
}
