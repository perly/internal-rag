import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConnectionsService } from './connections.service.js';

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
      response.redirect(`${origin}/documents/new/connect?drive=error`);
      return;
    }
    try {
      const connection = await this.connectionsService.connect(code, state);
      response.redirect(`${origin}/documents/new/connect?drive=${connection.id}`);
    } catch {
      response.redirect(`${origin}/documents/new/connect?drive=error`);
    }
  }
}
