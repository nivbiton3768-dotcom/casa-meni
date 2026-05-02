import {
  Body,
  Controller,
  Delete,
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
import { LoanType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CreateLoanDto {
  propertyId?: string;
  type?: LoanType;
  lenderName: string;
  principalCents: number;
  rateBps: number;
  termMonths: number;
  startDate: string;
  monthlyPaymentCents?: number;
  escrowCents?: number;
  notes?: string;
}

/** Standard PMT formula (P&I only). */
function computeMonthlyPayment(principalCents: number, rateBps: number, termMonths: number) {
  const r = rateBps / 10_000 / 12;
  if (r === 0) return Math.round(principalCents / termMonths);
  const factor = Math.pow(1 + r, termMonths);
  const monthly = (principalCents * (r * factor)) / (factor - 1);
  return Math.round(monthly);
}

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.loan.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { property: { select: { id: true, name: true } } },
    });
  }

  async create(organizationId: string, dto: CreateLoanDto) {
    const monthly =
      dto.monthlyPaymentCents ??
      computeMonthlyPayment(dto.principalCents, dto.rateBps, dto.termMonths);
    return this.prisma.loan.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        type: dto.type ?? 'MORTGAGE',
        lenderName: dto.lenderName,
        principalCents: dto.principalCents,
        rateBps: dto.rateBps,
        termMonths: dto.termMonths,
        startDate: new Date(dto.startDate),
        monthlyPaymentCents: monthly,
        escrowCents: dto.escrowCents ?? 0,
        notes: dto.notes,
      },
    });
  }

  async update(organizationId: string, id: string, dto: Partial<CreateLoanDto>) {
    const loan = await this.prisma.loan.findFirst({ where: { id, organizationId } });
    if (!loan) throw new NotFoundException('Loan not found');
    return this.prisma.loan.update({
      where: { id },
      data: {
        propertyId: dto.propertyId,
        type: dto.type,
        lenderName: dto.lenderName,
        principalCents: dto.principalCents,
        rateBps: dto.rateBps,
        termMonths: dto.termMonths,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        monthlyPaymentCents: dto.monthlyPaymentCents,
        escrowCents: dto.escrowCents,
        notes: dto.notes,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, organizationId } });
    if (!loan) throw new NotFoundException('Loan not found');
    await this.prisma.loan.delete({ where: { id } });
    return { ok: true };
  }

  /** Build the amortization schedule (P&I + cumulative interest). */
  amortization(loan: { principalCents: number; rateBps: number; termMonths: number; monthlyPaymentCents: number; startDate: Date }) {
    const r = loan.rateBps / 10_000 / 12;
    let balance = loan.principalCents;
    const rows: Array<{
      monthIndex: number;
      date: string;
      paymentCents: number;
      interestCents: number;
      principalCents: number;
      balanceCents: number;
    }> = [];
    let cumulativeInterest = 0;
    for (let i = 0; i < loan.termMonths; i++) {
      const interest = Math.round(balance * r);
      const principal = Math.min(loan.monthlyPaymentCents - interest, balance);
      balance -= principal;
      cumulativeInterest += interest;
      const date = new Date(loan.startDate);
      date.setMonth(date.getMonth() + i + 1);
      rows.push({
        monthIndex: i + 1,
        date: date.toISOString().slice(0, 10),
        paymentCents: principal + interest,
        interestCents: interest,
        principalCents: principal,
        balanceCents: Math.max(0, balance),
      });
      if (balance <= 0) break;
    }
    return { rows, cumulativeInterest, totalPaid: cumulativeInterest + loan.principalCents };
  }

  async schedule(organizationId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, organizationId } });
    if (!loan) throw new NotFoundException('Loan not found');
    return this.amortization(loan);
  }
}

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT', 'PROPERTY_MANAGER')
export class LoansController {
  constructor(private readonly service: LoansService) {}

  @Get()
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.service.list(organizationId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateLoanDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateLoanDto>,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(organizationId, id);
  }

  @Get(':id/schedule')
  schedule(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.schedule(organizationId, id);
  }
}

@Module({
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
