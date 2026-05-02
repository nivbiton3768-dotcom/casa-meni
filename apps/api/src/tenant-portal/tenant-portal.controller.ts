import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TenantPortalService } from './tenant-portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubmitRequestDto } from './dto/submit-request.dto';

@Controller('tenant-portal')
@UseGuards(JwtAuthGuard)
export class TenantPortalController {
  constructor(private readonly service: TenantPortalService) {}

  @Get('dashboard')
  getDashboard(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getDashboard(userId, orgId);
  }

  @Get('lease')
  getMyLease(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getMyLease(userId, orgId);
  }

  @Get('payments')
  getMyPayments(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getMyPayments(userId, orgId);
  }

  @Get('work-orders')
  getMyWorkOrders(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getMyWorkOrders(userId, orgId);
  }

  @Get('work-orders/:id')
  getWorkOrderDetail(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Param('id') jobId: string,
  ) {
    return this.service.getWorkOrderDetail(userId, orgId, jobId);
  }

  @Post('work-orders')
  submitWorkOrder(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: SubmitRequestDto,
  ) {
    return this.service.submitWorkOrder(userId, orgId, dto);
  }

  @Post('work-orders/:id/messages')
  addMessage(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Param('id') jobId: string,
    @Body('body') body: string,
  ) {
    return this.service.addWorkOrderMessage(userId, orgId, jobId, body);
  }
}
