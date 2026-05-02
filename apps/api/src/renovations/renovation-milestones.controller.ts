import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CreateMilestoneDto {
  name: string;
  description?: string;
  triggerPercent?: number;
  paymentCents?: number;
}

@Injectable()
export class RenovationMilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwn(organizationId: string, renovationId: string) {
    const reno = await this.prisma.renovation.findFirst({
      where: { id: renovationId, property: { organizationId } },
    });
    if (!reno) throw new NotFoundException('Renovation not found');
    return reno;
  }

  async list(organizationId: string, renovationId: string) {
    await this.assertOwn(organizationId, renovationId);
    return this.prisma.renovationMilestone.findMany({
      where: { renovationId },
      orderBy: { orderIdx: 'asc' },
    });
  }

  async create(organizationId: string, renovationId: string, dto: CreateMilestoneDto) {
    await this.assertOwn(organizationId, renovationId);
    const last = await this.prisma.renovationMilestone.findFirst({
      where: { renovationId },
      orderBy: { orderIdx: 'desc' },
    });
    return this.prisma.renovationMilestone.create({
      data: {
        renovationId,
        name: dto.name,
        description: dto.description,
        triggerPercent: dto.triggerPercent ?? 0,
        paymentCents: dto.paymentCents ?? 0,
        orderIdx: (last?.orderIdx ?? -1) + 1,
      },
    });
  }

  async complete(organizationId: string, milestoneId: string) {
    const milestone = await this.prisma.renovationMilestone.findFirst({
      where: { id: milestoneId, renovation: { property: { organizationId } } },
      include: { renovation: { include: { property: true } } },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');
    const updated = await this.prisma.renovationMilestone.update({
      where: { id: milestoneId },
      data: { completedAt: new Date() },
    });
    if (milestone.paymentCents > 0) {
      await this.prisma.renovationExpense.create({
        data: {
          renovationId: milestone.renovationId,
          category: 'milestone-payment',
          description: `Milestone: ${milestone.name}`,
          amountCents: milestone.paymentCents,
          date: new Date(),
        },
      });
      await this.prisma.renovationMilestone.update({
        where: { id: milestoneId },
        data: { paidAt: new Date() },
      });
    }
    return updated;
  }

  async remove(organizationId: string, milestoneId: string) {
    const m = await this.prisma.renovationMilestone.findFirst({
      where: { id: milestoneId, renovation: { property: { organizationId } } },
    });
    if (!m) throw new NotFoundException('Milestone not found');
    await this.prisma.renovationMilestone.delete({ where: { id: milestoneId } });
    return { ok: true };
  }
}

@Controller('renovations/:renovationId/milestones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class RenovationMilestonesController {
  constructor(private readonly service: RenovationMilestonesService) {}

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Param('renovationId') renovationId: string,
  ) {
    return this.service.list(organizationId, renovationId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Param('renovationId') renovationId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.service.create(organizationId, renovationId, dto);
  }

  @Patch(':milestoneId/complete')
  complete(
    @CurrentUser('organizationId') organizationId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.service.complete(organizationId, milestoneId);
  }

  @Delete(':milestoneId')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.service.remove(organizationId, milestoneId);
  }
}
