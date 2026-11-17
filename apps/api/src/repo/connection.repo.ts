import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const publicSelect = {
  id: true,
  provider: true,
  displayName: true,
  status: true,
} as const;

@Injectable()
export class ConnectionRepo {
  constructor(private readonly prismaService: PrismaService) {}

  list() {
    return this.prismaService.connection.findMany({
      select: publicSelect,
      orderBy: { updatedAt: 'desc' },
    });
  }

  find(id: string) {
    return this.prismaService.connection.findUnique({ where: { id } });
  }

  create(data: { displayName: string; credentials: string }) {
    return this.prismaService.connection.create({
      data: { provider: 'gdrive', displayName: data.displayName, credentials: data.credentials },
      select: publicSelect,
    });
  }

  saveCredentials(id: string, credentials: string) {
    return this.prismaService.connection.update({ where: { id }, data: { credentials } });
  }
}
