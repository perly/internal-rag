import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('api/health')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async get(): Promise<{ api: 'ok'; database: 'ok' }> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is not reachable.');
    }
    return { api: 'ok', database: 'ok' };
  }
}
