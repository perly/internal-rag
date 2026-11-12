import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DocumentsService } from './documents.service.js';
import { MAX_UPLOAD_BYTES, textFromUpload } from '../helper/extract-text.helper.js';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list() {
    return this.documentsService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.documentsService.get(id);
  }

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async create(@Body() dto: CreateDocumentDto, @UploadedFile() file?: Express.Multer.File) {
    const body = file ? await textFromUpload(file) : dto.body;
    if (body === undefined) {
      throw new BadRequestException('Provide document text or a .md, .txt, or .pdf file.');
    }
    return this.documentsService.save({ title: dto.title, body, sourceUrl: dto.sourceUrl });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.documentsService.remove(id);
  }
}
