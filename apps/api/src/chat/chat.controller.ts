import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { AskDto } from './dto/ask.dto.js';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  ask(@Body() dto: AskDto) {
    return this.chat.ask(dto.question);
  }
}
