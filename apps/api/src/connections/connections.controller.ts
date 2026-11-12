import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ConnectionsService } from './connections.service.js';

class ChooseFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  folderId: string;
}

@Controller('api/connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  list() {
    return this.connectionsService.list();
  }

  @Get('gdrive/start')
  start(@Query('displayName') displayName = '') {
    return { url: this.connectionsService.startUrl(displayName) };
  }

  @Get('gdrive/callback')
  async callback(
    @Query('code') code = '',
    @Query('state') state = '',
    @Query('error') oauthError = '',
    @Res() response: Response,
  ) {
    const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
    if (oauthError || !code || !state) {
      response.redirect(`${origin}/?drive=error`);
      return;
    }
    try {
      const connection = await this.connectionsService.connect(code, state);
      response.redirect(`${origin}/?drive=${connection.id}`);
    } catch {
      response.redirect(`${origin}/?drive=error`);
    }
  }

  @Get(':id/folders')
  folders(@Param('id') id: string) {
    return this.connectionsService.folders(id);
  }

  @Post(':id/folder')
  chooseFolder(@Param('id') id: string, @Body() dto: ChooseFolderDto) {
    return this.connectionsService.chooseFolder(id, dto.folderId);
  }
}
