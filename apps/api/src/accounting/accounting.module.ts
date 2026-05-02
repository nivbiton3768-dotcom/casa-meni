import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JournalLineInput {
  accountId: string;
  debitCents?: number;
  creditCents?: number;
  memo?: string;
}

interface JournalEntryInput {
  date: string;
  description: string;
  reference?: string;
  lines: JournalLineInput[];
}

const DEFAULT_ACCOUNTS: Array<{ code: string; name: string; type: AccountType }> = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1200', name: 'Security Deposits Held (Trust)', type: 'ASSET' },
  { code: '1500', name: 'Buildings', type: 'ASSET' },
  { code: '1510', name: 'Land', type: 'ASSET' },
  { code: '1600', name: 'Furniture & Fixtures', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2100', name: 'Security Deposit Liability', type: 'LIABILITY' },
  { code: '2200', name: 'Mortgage Payable', type: 'LIABILITY' },
  { code: '3000', name: "Owner's Equity", type: 'EQUITY' },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY' },
  { code: '4000', name: 'Rental Income', type: 'INCOME' },
  { code: '4100', name: 'Late Fee Income', type: 'INCOME' },
  { code: '4200', name: 'Other Income', type: 'INCOME' },
  { code: '5000', name: 'Repairs & Maintenance', type: 'EXPENSE' },
  { code: '5100', name: 'Utilities', type: 'EXPENSE' },
  { code: '5200', name: 'Property Insurance', type: 'EXPENSE' },
  { code: '5300', name: 'Property Taxes', type: 'EXPENSE' },
  { code: '5400', name: 'Mortgage Interest', type: 'EXPENSE' },
  { code: '5500', name: 'Cleaning', type: 'EXPENSE' },
  { code: '5600', name: 'Marketing', type: 'EXPENSE' },
  { code: '5700', name: 'Professional Fees', type: 'EXPENSE' },
  { code: '5800', name: 'Bank Fees', type: 'EXPENSE' },
  { code: '5900', name: 'Other Expenses', type: 'EXPENSE' },
];

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lazy-create the default chart of accounts for an organization. */
  async ensureChart(organizationId: string) {
    const existing = await this.prisma.account.count({ where: { organizationId } });
    if (existing > 0) return;
    await this.prisma.account.createMany({
      data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, organizationId })),
    });
  }

  async listAccounts(organizationId: string) {
    await this.ensureChart(organizationId);
    return this.prisma.account.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async createEntry(organizationId: string, dto: JournalEntryInput) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('Journal entry needs at least 2 lines');
    }
    const totalDebit = dto.lines.reduce((s, l) => s + (l.debitCents ?? 0), 0);
    const totalCredit = dto.lines.reduce((s, l) => s + (l.creditCents ?? 0), 0);
    if (totalDebit !== totalCredit || totalDebit === 0) {
      throw new BadRequestException(
        `Debits ($${totalDebit / 100}) must equal credits ($${totalCredit / 100}) and be non-zero`,
      );
    }

    const accounts = await this.prisma.account.findMany({
      where: { organizationId, id: { in: dto.lines.map((l) => l.accountId) } },
      select: { id: true },
    });
    if (accounts.length !== new Set(dto.lines.map((l) => l.accountId)).size) {
      throw new BadRequestException('One or more accounts not found in this organization');
    }

    return this.prisma.journalEntry.create({
      data: {
        organizationId,
        date: new Date(dto.date),
        description: dto.description,
        reference: dto.reference,
        postedAt: new Date(),
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            debitCents: l.debitCents ?? 0,
            creditCents: l.creditCents ?? 0,
            memo: l.memo,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async listEntries(
    organizationId: string,
    filters: { from?: string; to?: string; accountId?: string },
  ) {
    const where: Prisma.JournalEntryWhereInput = { organizationId };
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    if (filters.accountId) {
      where.lines = { some: { accountId: filters.accountId } };
    }
    return this.prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200,
      include: { lines: { include: { account: true } } },
    });
  }

  /** Trial balance: sum of debits/credits per account. */
  async trialBalance(organizationId: string, asOf?: string) {
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' },
    });
    const lines = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        entry: {
          organizationId,
          ...(asOf ? { date: { lte: new Date(asOf) } } : {}),
        },
      },
      _sum: { debitCents: true, creditCents: true },
    });
    const map = new Map(lines.map((l) => [l.accountId, l]));
    let totalDebit = 0;
    let totalCredit = 0;
    const rows = accounts.map((a) => {
      const agg = map.get(a.id);
      const d = agg?._sum.debitCents ?? 0;
      const c = agg?._sum.creditCents ?? 0;
      const balance =
        a.type === 'ASSET' || a.type === 'EXPENSE' ? d - c : c - d;
      totalDebit += d;
      totalCredit += c;
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debitCents: d,
        creditCents: c,
        balanceCents: balance,
      };
    });
    return {
      asOf: asOf ?? new Date().toISOString().slice(0, 10),
      rows,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
    };
  }
}

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT', 'PROPERTY_MANAGER')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get('accounts')
  accounts(@CurrentUser('organizationId') organizationId: string) {
    return this.service.listAccounts(organizationId);
  }

  @Post('entries')
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: JournalEntryInput,
  ) {
    return this.service.createEntry(organizationId, dto);
  }

  @Get('entries')
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.listEntries(organizationId, { from, to, accountId });
  }

  @Get('trial-balance')
  trial(
    @CurrentUser('organizationId') organizationId: string,
    @Query('asOf') asOf?: string,
  ) {
    return this.service.trialBalance(organizationId, asOf);
  }
}

@Module({
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
