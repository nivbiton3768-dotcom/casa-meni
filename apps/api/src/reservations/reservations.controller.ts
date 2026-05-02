import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.reservationsService.findAll(orgId);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser('organizationId') orgId: string) {
    return this.reservationsService.getUpcoming(orgId);
  }
}
