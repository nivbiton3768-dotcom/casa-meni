import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PresignedUrlDto, ConfirmUploadDto } from './dto/upload.dto';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presigned-url')
  getPresignedUrl(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: PresignedUrlDto,
  ) {
    return this.uploadsService.getPresignedUploadUrl(
      orgId,
      userId,
      dto.filename,
      dto.mimeType,
      dto.entityType,
      dto.entityId,
    );
  }

  @Post('confirm')
  confirmUpload(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.uploadsService.confirmUpload(orgId, userId, dto);
  }

  @Get()
  findByEntity(
    @CurrentUser('organizationId') orgId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.uploadsService.findByEntity(orgId, entityType, entityId);
  }

  @Get(':id/download')
  getDownloadUrl(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.uploadsService.getDownloadUrl(orgId, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.uploadsService.remove(orgId, id);
  }
}
