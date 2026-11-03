import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { MissingApiKeyError } from '../ingestion/embedder.js';
import type { PromptMessage } from './prompt.js';

export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';

@Injectable()
export class OpenAiCompleter {
  async complete(messages: PromptMessage[]): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new MissingApiKeyError();

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: process.env.CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL,
      temperature: 0,
      messages,
    });
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('The model returned an empty response.');
    return content;
  }
}
