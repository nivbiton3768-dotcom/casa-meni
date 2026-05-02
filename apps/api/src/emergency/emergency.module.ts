import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  EmergencySeverity,
  EmergencyStatus,
  JobPriority,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';

interface ReportEmergencyDto {
  category: string; // gas/water/electric/intrusion/fire/medical
  description: string;
  severity?: EmergencySeverity;
  propertyId?: string;
  unitId?: string;
}

@Injectable()
export class EmergencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async report(
    organizationId: string,
    reportedBy: string,
    dto: ReportEmergencyDto,
  ) {
    let propertyId = dto.propertyId;
    if (!propertyId && dto.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: dto.unitId },
        select: { propertyId: true },
      });
      propertyId = unit?.propertyId;
    }
    // For tenants, infer property from active lease if not provided.
    if (!propertyId) {
      const lease = await this.prisma.lease.findFirst({
        where: { tenantId: reportedBy, status: 'ACTIVE' },
        select: { unit: { select: { propertyId: true, id: true } } },
      });
      propertyId = lease?.unit.propertyId;
    }

    const event = await this.prisma.emergencyEvent.create({
      data: {
        organizationId,
        propertyId,
        unitId: dto.unitId,
        reportedBy,
        severity: dto.severity ?? 'CRITICAL',
        category: dto.category,
        description: dto.description,
      },
    });

    // Auto-create a maintenance job at urgent priority.
    if (propertyId) {
      const job = await this.prisma.maintenanceJob.create({
        data: {
          organizationId,
          propertyId,
          unitId: dto.unitId,
          createdById: reportedBy,
          title: `EMERGENCY: ${dto.category}`,
          description: dto.description,
          priority: JobPriority.EMERGENCY,
          category: dto.category,
        },
      });
      await this.prisma.emergencyEvent.update({
        where: { id: event.id },
        data: { jobId: job.id },
      });
    }

    // Notify all owners + property managers immediately.
    const recipients = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['OWNER', 'PROPERTY_MANAGER'] },
        isActive: true,
      },
    });
    const reporter = await this.prisma.user.findUnique({
      where: { id: reportedBy },
      select: { name: true, email: true, phone: true },
    });
    const property = propertyId
      ? await this.prisma.property.findUnique({
          where: { id: propertyId },
          select: { name: true, address: true, emergencyContacts: true },
        })
      : null;

    await this.prisma.notification.createMany({
      data: recipients.map((r) => ({
        organizationId,
        userId: r.id,
        type: NotificationType.EMERGENCY_REPORTED,
        title: `EMERGENCY: ${dto.category}`,
        message: `${reporter?.name ?? 'Tenant'} reported ${dto.category} at ${property?.name ?? 'a property'}.`,
        linkUrl: `/maintenance`,
      })),
    });

    for (const r of recipients) {
      await this.email.sendNotification(r.email, {
        recipientName: r.name,
        notificationTitle: `[URGENT] Emergency at ${property?.name ?? 'property'}`,
        notificationBody: `Category: ${dto.category}\nReported by: ${reporter?.name ?? '?'} (${reporter?.email ?? ''}, ${reporter?.phone ?? 'no phone'})\n\n${dto.description}\n\nProperty emergency contacts on file:\n${property?.emergencyContacts ?? '(none)'}`,
      });
    }

    return event;
  }

  async list(
    organizationId: string,
    filters: { status?: EmergencyStatus },
  ) {
    return this.prisma.emergencyEvent.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async acknowledge(organizationId: string, id: string, userId: string) {
    const event = await this.prisma.emergencyEvent.findFirst({
      where: { id, organizationId },
    });
    if (!event) throw new NotFoundException('Emergency not found');
    return this.prisma.emergencyEvent.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolve(organizationId: string, id: string) {
    const event = await this.prisma.emergencyEvent.findFirst({
      where: { id, organizationId },
    });
    if (!event) throw new NotFoundException('Emergency not found');
    return this.prisma.emergencyEvent.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }
}

@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private readonly service: EmergencyService) {}

  /** Any authenticated user (incl. tenants) can report. */
  @Post('report')
  report(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportEmergencyDto,
  ) {
    return this.service.report(organizationId, userId, dto);
  }
}

@Controller('emergency/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER')
export class EmergencyAdminController {
  constructor(private readonly service: EmergencyService) {}

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('status') status?: EmergencyStatus,
  ) {
    return this.service.list(organizationId, { status });
  }

  @Patch(':id/acknowledge')
  acknowledge(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.acknowledge(organizationId, id, userId);
  }

  @Patch(':id/resolve')
  resolve(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.resolve(organizationId, id);
  }
}

@Module({
  imports: [],
  controllers: [EmergencyController, EmergencyAdminController],
  providers: [EmergencyService],
})
export class EmergencyModule {}
