import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.documentsService.findAll(orgId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(orgId, dto);
  }
}
