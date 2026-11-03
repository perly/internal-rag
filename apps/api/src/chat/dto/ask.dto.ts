import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const MAX_QUESTION_CHARS = 64 * 1024;

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_QUESTION_CHARS)
  question: string;
}
