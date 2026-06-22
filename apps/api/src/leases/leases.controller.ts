import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('leases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateLeaseDto,
  ) {
    return this.leasesService.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.leasesService.findAll(orgId);
  }

  @Get('tenants')
  getTenants(@CurrentUser('organizationId') orgId: string) {
    return this.leasesService.getTenants(orgId);
  }

  @Get('vacant-units')
  getVacantUnits(@CurrentUser('organizationId') orgId: string) {
    return this.leasesService.getVacantUnits(orgId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.leasesService.findOne(orgId, id);
  }

  @Patch(':id/end')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  endLease(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.leasesService.endLease(orgId, id);
  }

  @Patch('payments/:paymentId/pay')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER, Role.ACCOUNTANT)
  recordPayment(
    @CurrentUser('organizationId') orgId: string,
    @Param('paymentId') paymentId: string,
    @Body('method') method: string,
  ) {
    return this.leasesService.recordPayment(orgId, paymentId, method || 'manual');
  }
}
