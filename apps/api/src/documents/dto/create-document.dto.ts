import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../helper/trim.helper.js';

export class CreateDocumentDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Title is required.' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sourceUrl?: string;
}
