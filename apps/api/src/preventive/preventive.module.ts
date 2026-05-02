import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  OnModuleInit,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceCadence, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueueService } from '../queue/queue.service';

interface CreatePreventiveDto {
  propertyId?: string;
  unitId?: string;
  assetId?: string;
  title: string;
  description?: string;
  cadence: MaintenanceCadence;
  cadenceDays?: number;
  nextDueAt: string;
}

function advance(from: Date, cadence: MaintenanceCadence, days?: number): Date {
  const d = new Date(from);
  switch (cadence) {
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'SEMI_ANNUAL':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'ANNUAL':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'CUSTOM_DAYS':
      d.setDate(d.getDate() + (days ?? 30));
      break;
  }
  return d;
}

@Injectable()
export class PreventiveService implements OnModuleInit {
  private readonly logger = new Logger(PreventiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  onModuleInit() {
    this.queue.registerWorker('preventive-maintenance-scan', async () => {
      await this.scanAndDispatch();
    });
    this.queue.registerWorker('warranty-expiry-scan', async () => {
      await this.scanWarranties();
    });
    void this.queue.scheduleRecurring(
      'preventive-maintenance-scan',
      {},
      { pattern: '0 6 * * *' }, // 6am daily
    );
    void this.queue.scheduleRecurring(
      'warranty-expiry-scan',
      {},
      { pattern: '0 7 * * 1' }, // 7am every Monday
    );
  }

  async list(organizationId: string) {
    return this.prisma.preventiveTask.findMany({
      where: { organizationId },
      orderBy: { nextDueAt: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreatePreventiveDto) {
    return this.prisma.preventiveTask.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        assetId: dto.assetId,
        title: dto.title,
        description: dto.description,
        cadence: dto.cadence,
        cadenceDays: dto.cadenceDays,
        nextDueAt: new Date(dto.nextDueAt),
      },
    });
  }

  async update(organizationId: string, id: string, dto: Partial<CreatePreventiveDto>) {
    const task = await this.prisma.preventiveTask.findFirst({ where: { id, organizationId } });
    if (!task) throw new NotFoundException('Preventive task not found');
    return this.prisma.preventiveTask.update({
      where: { id },
      data: {
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        assetId: dto.assetId,
        title: dto.title,
        description: dto.description,
        cadence: dto.cadence,
        cadenceDays: dto.cadenceDays,
        nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
      },
    });
  }

  async complete(organizationId: string, id: string) {
    const task = await this.prisma.preventiveTask.findFirst({ where: { id, organizationId } });
    if (!task) throw new NotFoundException('Preventive task not found');
    const next = advance(new Date(), task.cadence, task.cadenceDays ?? undefined);
    return this.prisma.preventiveTask.update({
      where: { id },
      data: {
        lastCompletedAt: new Date(),
        nextDueAt: next,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const task = await this.prisma.preventiveTask.findFirst({ where: { id, organizationId } });
    if (!task) throw new NotFoundException('Preventive task not found');
    await this.prisma.preventiveTask.delete({ where: { id } });
    return { ok: true };
  }

  /** Daily scanner: any active preventive task due today/past = create a maintenance ticket. */
  async scanAndDispatch() {
    const now = new Date();
    const due = await this.prisma.preventiveTask.findMany({
      where: { isActive: true, nextDueAt: { lte: now } },
    });
    let created = 0;
    for (const task of due) {
      if (!task.propertyId) continue;
      // Owner of the org for createdById
      const owner = await this.prisma.user.findFirst({
        where: { organizationId: task.organizationId, role: 'OWNER' },
      });
      if (!owner) continue;
      await this.prisma.maintenanceJob.create({
        data: {
          organizationId: task.organizationId,
          propertyId: task.propertyId,
          unitId: task.unitId,
          createdById: owner.id,
          title: `[Preventive] ${task.title}`,
          description: task.description ?? '',
          priority: 'MEDIUM',
          category: 'preventive',
        },
      });
      const next = advance(task.nextDueAt, task.cadence, task.cadenceDays ?? undefined);
      await this.prisma.preventiveTask.update({
        where: { id: task.id },
        data: { nextDueAt: next, lastCompletedAt: new Date() },
      });
      created++;
    }
    this.logger.log(`Preventive scan: created ${created} jobs from ${due.length} due tasks`);
    return { created };
  }

  async scanWarranties() {
    const soon = new Date();
    soon.setDate(soon.getDate() + 60);
    const expiring = await this.prisma.asset.findMany({
      where: { warrantyExpires: { gte: new Date(), lte: soon } },
    });
    for (const asset of expiring) {
      const owners = await this.prisma.user.findMany({
        where: {
          organizationId: asset.organizationId,
          role: { in: ['OWNER', 'PROPERTY_MANAGER'] },
        },
      });
      await this.prisma.notification.createMany({
        data: owners.map((o) => ({
          organizationId: asset.organizationId,
          userId: o.id,
          type: NotificationType.WARRANTY_EXPIRING,
          title: 'Warranty expiring soon',
          message: `${asset.name} (${asset.brand ?? '?'} ${asset.modelNumber ?? ''}) warranty expires ${asset.warrantyExpires?.toLocaleDateString()}.`,
          linkUrl: '/assets',
        })),
      });
    }
    return { count: expiring.length };
  }
}

@Controller('preventive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_TECH')
export class PreventiveController {
  constructor(private readonly service: PreventiveService) {}

  @Get()
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.service.list(organizationId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreatePreventiveDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePreventiveDto>,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.complete(organizationId, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(organizationId, id);
  }

  @Post('scan')
  @Roles('OWNER')
  scan() {
    return this.service.scanAndDispatch();
  }
}

@Module({
  controllers: [PreventiveController],
  providers: [PreventiveService],
  exports: [PreventiveService],
})
export class PreventiveModule {}
