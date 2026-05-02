import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('checklist')
  getChecklist(@CurrentUser('organizationId') organizationId: string) {
    return this.service.getChecklist(organizationId);
  }
}
