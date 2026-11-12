import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { AskDto } from './dto/ask.dto.js';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  ask(@Body() dto: AskDto) {
    return this.chatService.ask(dto.question);
  }
}
