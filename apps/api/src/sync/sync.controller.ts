import { Controller, Param, Post } from '@nestjs/common';
import { SyncService } from './sync.service.js';

@Controller('api/connections')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post(':id/sync')
  sync(@Param('id') id: string) {
    return this.syncService.sync(id);
  }
}
