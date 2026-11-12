import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../helper/trim.helper.js';

export const MAX_QUESTION_CHARS = 64 * 1024;

export class AskDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_QUESTION_CHARS)
  question: string;
}
