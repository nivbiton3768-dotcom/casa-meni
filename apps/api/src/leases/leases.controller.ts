import { Controller, Get, UseGuards } from '@nestjs/common';
import { LeasesService } from './leases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('leases')
@UseGuards(JwtAuthGuard)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.leasesService.findAll(orgId);
  }

  @Get('tenants')
  getTenants(@CurrentUser('organizationId') orgId: string) {
    return this.leasesService.getTenants(orgId);
  }
}
