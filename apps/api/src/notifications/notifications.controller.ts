import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Query('unread') unread?: string,
  ) {
    return this.service.findAll(orgId, userId, unread === 'true');
  }

  @Get('unread-count')
  getUnreadCount(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.getUnreadCount(orgId, userId);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.markRead(orgId, id);
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.markAllRead(orgId, userId);
  }

  @Post('generate')
  generateAlerts(@CurrentUser('organizationId') orgId: string) {
    return this.service.generateAlerts(orgId);
  }
}
