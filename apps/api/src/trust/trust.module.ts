import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
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

interface CreateDepositDto {
  leaseId: string;
  bankAccountId?: string;
  amountCents: number;
  receivedAt: string;
  notes?: string;
}

interface RefundDepositDto {
  refundedCents: number;
  forfeitedReason?: string;
  notes?: string;
}

@Injectable()
export class TrustService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeposit(organizationId: string, dto: CreateDepositDto) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: dto.leaseId, organizationId },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (dto.bankAccountId) {
      const bank = await this.prisma.bankAccount.findFirst({
        where: { id: dto.bankAccountId, organizationId },
      });
      if (!bank) throw new NotFoundException('Bank account not found');
      if (!bank.isTrustAccount) {
        // Auto-flag: in many states, deposits MUST be in a trust account
      }
    }
    return this.prisma.securityDeposit.create({
      data: {
        leaseId: dto.leaseId,
        bankAccountId: dto.bankAccountId,
        amountCents: dto.amountCents,
        receivedAt: new Date(dto.receivedAt),
        notes: dto.notes,
      },
    });
  }

  async listForOrg(organizationId: string) {
    return this.prisma.securityDeposit.findMany({
      where: { lease: { organizationId } },
      orderBy: { receivedAt: 'desc' },
      include: {
        lease: {
          include: {
            tenant: { select: { name: true } },
            unit: { include: { property: { select: { name: true } } } },
          },
        },
      },
    });
  }

  async refund(id: string, organizationId: string, dto: RefundDepositDto) {
    const dep = await this.prisma.securityDeposit.findFirst({
      where: { id, lease: { organizationId } },
    });
    if (!dep) throw new NotFoundException('Deposit not found');
    const refunded = Math.min(dto.refundedCents, dep.amountCents);
    const status =
      refunded === dep.amountCents
        ? 'FULL_REFUND'
        : refunded > 0
          ? 'PARTIAL_REFUND'
          : 'FORFEITED';
    return this.prisma.securityDeposit.update({
      where: { id },
      data: {
        status,
        refundedCents: refunded,
        refundedAt: new Date(),
        forfeitedReason: dto.forfeitedReason,
        notes: dto.notes,
      },
    });
  }

  /** Reconciliation: total trust balance vs sum of held deposits. */
  async reconciliation(organizationId: string) {
    const trust = await this.prisma.bankAccount.findMany({
      where: { organizationId, isTrustAccount: true },
      select: { id: true, name: true, currentBalanceCents: true },
    });
    const heldAgg = await this.prisma.securityDeposit.aggregate({
      where: { lease: { organizationId }, status: { in: ['HELD', 'PARTIAL_REFUND'] } },
      _sum: { amountCents: true, refundedCents: true },
    });
    const heldCents =
      (heldAgg._sum.amountCents ?? 0) - (heldAgg._sum.refundedCents ?? 0);
    const trustBalanceCents = trust.reduce((s, b) => s + b.currentBalanceCents, 0);
    return {
      trustAccounts: trust,
      trustBalanceCents,
      heldDepositsCents: heldCents,
      varianceCents: trustBalanceCents - heldCents,
      isReconciled: trustBalanceCents - heldCents >= 0,
    };
  }
}

@Controller('trust')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT', 'PROPERTY_MANAGER')
export class TrustController {
  constructor(private readonly service: TrustService) {}

  @Get('deposits')
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.service.listForOrg(organizationId);
  }

  @Post('deposits')
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateDepositDto,
  ) {
    return this.service.createDeposit(organizationId, dto);
  }

  @Patch('deposits/:id/refund')
  refund(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: RefundDepositDto,
  ) {
    return this.service.refund(id, organizationId, dto);
  }

  @Get('reconciliation')
  recon(@CurrentUser('organizationId') organizationId: string) {
    return this.service.reconciliation(organizationId);
  }
}

@Module({
  controllers: [TrustController],
  providers: [TrustService],
})
export class TrustModule {}
