import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChannelsService } from './channels.service';
import {
  CreateChannelFeedDto,
  UpdateChannelFeedDto,
} from './dto/channel-feed.dto';

@Controller('channels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER')
export class ChannelsController {
  constructor(private readonly service: ChannelsService) {}

  @Get('feeds')
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.service.listFeeds(organizationId);
  }

  @Post('feeds')
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateChannelFeedDto,
  ) {
    return this.service.createFeed(organizationId, dto);
  }

  @Patch('feeds/:id')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChannelFeedDto,
  ) {
    return this.service.updateFeed(organizationId, id, dto);
  }

  @Delete('feeds/:id')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteFeed(organizationId, id);
  }

  @Post('sync')
  sync(@CurrentUser('organizationId') organizationId: string) {
    return this.service.enqueueSyncOrganization(organizationId);
  }

  @Post('sync/now')
  syncNow(@CurrentUser('organizationId') organizationId: string) {
    return this.service.syncOrganization(organizationId);
  }
}

/**
 * Public, unauthenticated controller for serving outbound .ics calendar feeds
 * to Airbnb / VRBO / Booking. Token-based, not user-authenticated.
 */
@Controller('channels/feeds')
export class ChannelsExportController {
  constructor(private readonly service: ChannelsService) {}

  @Get(':token/export.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async export(@Param('token') token: string, @Res() res: Response) {
    const ics = await this.service.generateIcs(token);
    res.setHeader('Content-Disposition', 'inline; filename="casa-meni.ics"');
    res.send(ics);
  }
}
