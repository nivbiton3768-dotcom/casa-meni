import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GuestPortalService } from './guest-portal.service';

@Controller('public/guest')
export class GuestPortalPublicController {
  constructor(private readonly service: GuestPortalService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.service.getByToken(token);
  }
}

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER')
export class ReservationGuestTokenController {
  constructor(private readonly service: GuestPortalService) {}

  @Post(':id/guest-token')
  ensureToken(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.ensureToken(id, organizationId);
  }
}
