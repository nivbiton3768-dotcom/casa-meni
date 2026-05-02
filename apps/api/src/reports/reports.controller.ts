import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.PROPERTY_MANAGER, Role.ACCOUNTANT)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('monthly-pnl')
  getMonthlyPnl(
    @CurrentUser('organizationId') orgId: string,
    @Query('months') months?: string,
  ) {
    return this.service.getMonthlyPnl(orgId, months ? parseInt(months) : 12);
  }

  @Get('occupancy')
  getOccupancy(@CurrentUser('organizationId') orgId: string) {
    return this.service.getOccupancyRates(orgId);
  }

  @Get('rent-collection')
  getRentCollection(@CurrentUser('organizationId') orgId: string) {
    return this.service.getRentCollection(orgId);
  }

  @Get('renovation-burn')
  getRenovationBurn(@CurrentUser('organizationId') orgId: string) {
    return this.service.getRenovationBurn(orgId);
  }

  @Get('investor-returns')
  getInvestorReturns(@CurrentUser('organizationId') orgId: string) {
    return this.service.getInvestorReturns(orgId);
  }
}
