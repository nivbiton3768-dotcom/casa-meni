import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('logs')
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(organizationId, {
      entity,
      entityId,
      userId,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
