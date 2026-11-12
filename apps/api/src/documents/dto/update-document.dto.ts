import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../helper/trim.helper.js';

export class UpdateDocumentDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Title is required.' })
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(500_000)
  body: string;
}
