import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SyncService } from './sync.service.js';

class ImportDriveFilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  fileIds: string[];
}

@Controller('api/connections')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get(':id/files')
  files(@Param('id') id: string) {
    return this.syncService.availableFiles(id);
  }

  @Post(':id/import')
  importFiles(@Param('id') id: string, @Body() dto: ImportDriveFilesDto) {
    return this.syncService.importFiles(id, dto.fileIds);
  }
}
