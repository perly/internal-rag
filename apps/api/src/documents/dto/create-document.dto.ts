import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
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
