import { Module } from '@nestjs/common';
import { IngestionModule } from '../ingestion/ingestion.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { OpenAiCompleter } from './openai-completer.js';

@Module({
  imports: [IngestionModule],
  controllers: [ChatController],
  providers: [ChatService, OpenAiCompleter],
})
export class ChatModule {}
