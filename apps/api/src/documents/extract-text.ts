import { BadRequestException } from '@nestjs/common';
import { extractText } from 'unpdf';

const ALLOWED_EXTENSIONS = new Set(['md', 'txt', 'pdf']);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function textFromUpload(file: Express.Multer.File): Promise<string> {
  const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new BadRequestException('Upload a .md, .txt, or .pdf file.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('File is larger than 5 MB.');
  }

  if (extension === 'pdf') return pdfText(file.buffer);
  return file.buffer.toString('utf8');
}

async function pdfText(bytes: Buffer): Promise<string> {
  try {
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    return text;
  } catch {
    throw new BadRequestException('Could not read that PDF.');
  }
}
