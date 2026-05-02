import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface SetSplitsDto {
  splits: Array<{
    tenantId: string;
    sharePct: number;
    payOnAutopay?: boolean;
  }>;
}

@Injectable()
export class LeaseSplitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, leaseId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, organizationId },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    return this.prisma.leaseSplit.findMany({
      where: { leaseId },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { sharePct: 'desc' },
    });
  }

  async setSplits(organizationId: string, leaseId: string, dto: SetSplitsDto) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, organizationId },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    const total = dto.splits.reduce((s, x) => s + x.sharePct, 0);
    if (total !== 100) {
      throw new BadRequestException(`Splits must sum to 100% (got ${total}%)`);
    }
    const tenantIds = dto.splits.map((s) => s.tenantId);
    const tenants = await this.prisma.user.count({
      where: { id: { in: tenantIds }, organizationId, role: 'TENANT' },
    });
    if (tenants !== new Set(tenantIds).size) {
      throw new BadRequestException('All split parties must be tenants in this organization');
    }
    await this.prisma.$transaction([
      this.prisma.leaseSplit.deleteMany({ where: { leaseId } }),
      this.prisma.leaseSplit.createMany({
        data: dto.splits.map((s) => ({
          leaseId,
          tenantId: s.tenantId,
          sharePct: s.sharePct,
          payOnAutopay: s.payOnAutopay ?? false,
        })),
      }),
    ]);
    return this.list(organizationId, leaseId);
  }

  async remove(organizationId: string, leaseId: string, splitId: string) {
    const split = await this.prisma.leaseSplit.findFirst({
      where: { id: splitId, lease: { id: leaseId, organizationId } },
    });
    if (!split) throw new NotFoundException('Split not found');
    await this.prisma.leaseSplit.delete({ where: { id: splitId } });
    return { ok: true };
  }

  /**
   * Compute how a $X rent payment should be allocated across roommates.
   * Used by the payments service when splitting an incoming payment.
   */
  async allocate(leaseId: string, amountCents: number) {
    const splits = await this.prisma.leaseSplit.findMany({
      where: { leaseId },
    });
    if (splits.length === 0) return [];
    return splits.map((s) => ({
      tenantId: s.tenantId,
      sharePct: s.sharePct,
      amountCents: Math.round((amountCents * s.sharePct) / 100),
    }));
  }
}

@Controller('leases/:leaseId/splits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class LeaseSplitsController {
  constructor(private readonly service: LeaseSplitsService) {}

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Param('leaseId') leaseId: string,
  ) {
    return this.service.list(organizationId, leaseId);
  }

  @Post()
  set(
    @CurrentUser('organizationId') organizationId: string,
    @Param('leaseId') leaseId: string,
    @Body() dto: SetSplitsDto,
  ) {
    return this.service.setSplits(organizationId, leaseId, dto);
  }

  @Delete(':splitId')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('leaseId') leaseId: string,
    @Param('splitId') splitId: string,
  ) {
    return this.service.remove(organizationId, leaseId, splitId);
  }
}

@Module({
  controllers: [LeaseSplitsController],
  providers: [LeaseSplitsService],
  exports: [LeaseSplitsService],
})
export class LeaseSplitsModule {}
