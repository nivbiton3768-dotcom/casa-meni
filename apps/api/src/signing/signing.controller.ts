import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SigningService } from './signing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  CreateEnvelopeDto,
  SignEnvelopeDto,
  DeclineEnvelopeDto,
} from './dto/envelope.dto';

@Controller()
export class SigningController {
  constructor(private readonly service: SigningService) {}

  // ── Public signing endpoints (no auth — token is the credential) ──
  @Get('public/sign/:token')
  getByToken(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Post('public/sign/:token')
  sign(
    @Param('token') token: string,
    @Body() dto: SignEnvelopeDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.service.sign(token, dto, ip, ua);
  }

  @Post('public/sign/:token/decline')
  decline(
    @Param('token') token: string,
    @Body() dto: DeclineEnvelopeDto,
  ) {
    return this.service.decline(token, dto);
  }
}

@Controller('signing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SigningAdminController {
  constructor(private readonly service: SigningService) {}

  @Post('envelopes')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER, Role.ACCOUNTANT)
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEnvelopeDto,
  ) {
    return this.service.create(orgId, userId, dto);
  }

  @Get('envelopes')
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get('envelopes/pending-for-me')
  findPending(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.findPendingForUser(orgId, userId);
  }

  @Get('envelopes/:id')
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Patch('envelopes/:id/cancel')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  cancel(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(orgId, id);
  }

  @Get('envelopes/:id/signed-document')
  getSignedDocument(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.getSignedDocumentUrl(orgId, id);
  }
}
