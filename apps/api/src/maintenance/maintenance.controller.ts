import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobStatus } from '@prisma/client';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.maintenanceService.create(orgId, userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: JobStatus,
  ) {
    return this.maintenanceService.findAll(orgId, status);
  }

  @Get(':id')
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.maintenanceService.findOne(orgId, id);
  }

  @Patch(':id/assign')
  assign(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body('techId') techId: string,
  ) {
    return this.maintenanceService.assign(orgId, id, techId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body('status') status: JobStatus,
  ) {
    return this.maintenanceService.updateStatus(orgId, id, status);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') jobId: string,
    @CurrentUser('id') userId: string,
    @Body('body') body: string,
  ) {
    return this.maintenanceService.addMessage(jobId, userId, body);
  }
}
