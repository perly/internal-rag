import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(500_000)
  body: string;
}
