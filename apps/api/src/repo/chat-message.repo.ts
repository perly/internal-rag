import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ChatMessageWrite {
  question: string;
  answer: string;
  citedChunkIds: string[];
  usedModel: boolean;
}

@Injectable()
export class ChatMessageRepo {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: ChatMessageWrite) {
    return this.prismaService.chatMessage.create({ data });
  }
}
