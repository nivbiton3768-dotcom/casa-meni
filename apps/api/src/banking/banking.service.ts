import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BankAccountProvider,
  BankTransactionDirection,
  BankTransactionMatchStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlaidService } from '../plaid/plaid.service';
import { EmailService } from '../email/email.service';
import {
  TransactionMatcherService,
  MatchablePayment,
  MatchableTransaction,
} from './transaction-matcher.service';
import {
  CreateManualAccountDto,
  CreateManualTransactionDto,
  ImportCsvDto,
} from './dto/banking.dto';

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plaid: PlaidService,
    private readonly email: EmailService,
    private readonly matcher: TransactionMatcherService,
    private readonly config: ConfigService,
  ) {}

  // ──────────────────────────────────────
  // Settings
  // ──────────────────────────────────────

  getSettings() {
    return {
      plaidEnabled: this.plaid.enabled,
      env: this.config.get<string>('PLAID_ENV') ?? 'sandbox',
    };
  }

  // ──────────────────────────────────────
  // Plaid Link flow
  // ──────────────────────────────────────

  async createLinkToken(userId: string, organizationId: string) {
    if (!this.plaid.enabled) {
      throw new BadRequestException(
        'Bank syncing is not enabled. Set PLAID_CLIENT_ID and PLAID_SECRET to enable.',
      );
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return this.plaid.createLinkToken({
      userId,
      organizationName: org.name,
    });
  }

  async exchangePublicToken(organizationId: string, publicToken: string) {
    if (!this.plaid.enabled) {
      throw new BadRequestException('Bank syncing is not enabled.');
    }
    const { accessToken, itemId } =
      await this.plaid.exchangePublicToken(publicToken);
    const accounts = await this.plaid.getAccounts(accessToken);

    const created: { id: string; name: string }[] = [];
    for (const acct of accounts) {
      const exists = await this.prisma.bankAccount.findUnique({
        where: { plaidAccountId: acct.account_id },
      });
      if (exists) continue;

      const ba = await this.prisma.bankAccount.create({
        data: {
          organizationId,
          provider: BankAccountProvider.PLAID,
          type: this.mapPlaidType(acct.type, acct.subtype),
          name: acct.name,
          institutionName: acct.official_name ?? acct.name,
          mask: acct.mask ?? null,
          plaidItemId: itemId,
          plaidAccountId: acct.account_id,
          plaidAccessToken: accessToken,
          currentBalanceCents: this.dollarsToCents(
            acct.balances.current ?? acct.balances.available ?? 0,
          ),
        },
      });
      created.push({ id: ba.id, name: ba.name });
    }

    // Pull initial transactions
    let added = 0;
    let autoMatched = 0;
    if (created.length > 0) {
      const sync = await this.syncByItem(organizationId, itemId);
      added = sync.added;
      autoMatched = sync.autoMatched;
    }

    return {
      accountsCreated: created.length,
      accounts: created,
      transactionsAdded: added,
      transactionsAutoMatched: autoMatched,
    };
  }

  private mapPlaidType(type: string, subtype: string | null) {
    if (type === 'depository') {
      if (subtype === 'savings') return 'SAVINGS';
      return 'CHECKING';
    }
    if (type === 'credit') return 'CREDIT';
    return 'OTHER';
  }

  private dollarsToCents(value: number): number {
    return Math.round(value * 100);
  }

  // ──────────────────────────────────────
  // Manual accounts (Venmo, in-app balances, etc.)
  // ──────────────────────────────────────

  async createManualAccount(
    organizationId: string,
    dto: CreateManualAccountDto,
  ) {
    return this.prisma.bankAccount.create({
      data: {
        organizationId,
        provider: BankAccountProvider.MANUAL,
        type: dto.type,
        name: dto.name,
        institutionName: dto.institutionName ?? null,
        currentBalanceCents: dto.openingBalanceCents ?? 0,
      },
    });
  }

  // ──────────────────────────────────────
  // Listing
  // ──────────────────────────────────────

  async listAccounts(organizationId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      type: a.type,
      name: a.name,
      institutionName: a.institutionName,
      mask: a.mask,
      currentBalanceCents: a.currentBalanceCents,
      lastSyncedAt: a.lastSyncedAt,
    }));
  }

  async listTransactions(
    organizationId: string,
    filters: {
      bankAccountId?: string;
      matchStatus?: BankTransactionMatchStatus;
      direction?: BankTransactionDirection;
      limit?: number;
    },
  ) {
    const where: Prisma.BankTransactionWhereInput = {
      organizationId,
      ...(filters.bankAccountId
        ? { bankAccountId: filters.bankAccountId }
        : {}),
      ...(filters.matchStatus ? { matchStatus: filters.matchStatus } : {}),
      ...(filters.direction ? { direction: filters.direction } : {}),
    };
    const txns = await this.prisma.bankTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: filters.limit ?? 200,
      include: {
        bankAccount: { select: { id: true, name: true, mask: true } },
        matchedPayment: {
          select: {
            id: true,
            amountCents: true,
            dueDate: true,
            lease: {
              select: {
                tenant: { select: { name: true, email: true } },
                unit: {
                  select: {
                    unitNumber: true,
                    property: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    return txns;
  }

  // ──────────────────────────────────────
  // Sync (Plaid)
  // ──────────────────────────────────────

  async syncAll(organizationId: string) {
    const items = await this.prisma.bankAccount.findMany({
      where: {
        organizationId,
        provider: BankAccountProvider.PLAID,
        isActive: true,
      },
      select: { plaidItemId: true },
      distinct: ['plaidItemId'],
    });

    const summary = { added: 0, modified: 0, removed: 0, autoMatched: 0 };
    for (const item of items) {
      if (!item.plaidItemId) continue;
      const r = await this.syncByItem(organizationId, item.plaidItemId);
      summary.added += r.added;
      summary.modified += r.modified;
      summary.removed += r.removed;
      summary.autoMatched += r.autoMatched;
    }
    return summary;
  }

  private async syncByItem(organizationId: string, plaidItemId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: {
        organizationId,
        plaidItemId,
        provider: BankAccountProvider.PLAID,
      },
    });
    if (accounts.length === 0) {
      return { added: 0, modified: 0, removed: 0, autoMatched: 0 };
    }

    const accessToken = accounts[0].plaidAccessToken;
    if (!accessToken) {
      throw new Error(`Bank account missing access token for item ${plaidItemId}`);
    }

    // All accounts in same item share cursor; use first account's cursor.
    const cursor = accounts[0].plaidCursor ?? null;
    const sync = await this.plaid.syncTransactions(accessToken, cursor);

    const accountByPlaidId = new Map(
      accounts.map((a) => [a.plaidAccountId!, a]),
    );

    let added = 0;
    let autoMatched = 0;

    for (const t of sync.added) {
      const acct = accountByPlaidId.get(t.account_id);
      if (!acct) continue;
      // Plaid: positive amount = money OUT; negative = money IN
      const direction =
        t.amount < 0
          ? BankTransactionDirection.INCOMING
          : BankTransactionDirection.OUTGOING;
      const amountCents = Math.round(Math.abs(t.amount) * 100);

      const txn = await this.prisma.bankTransaction.upsert({
        where: {
          bankAccountId_externalId: {
            bankAccountId: acct.id,
            externalId: t.transaction_id,
          },
        },
        create: {
          organizationId,
          bankAccountId: acct.id,
          externalId: t.transaction_id,
          direction,
          amountCents,
          description: t.name ?? 'Bank transaction',
          merchantName: t.merchant_name ?? null,
          counterpartyName:
            t.counterparties && t.counterparties.length > 0
              ? t.counterparties[0].name ?? null
              : t.merchant_name ?? null,
          date: new Date(t.date),
          category: t.personal_finance_category?.primary ?? null,
        },
        update: {
          description: t.name ?? 'Bank transaction',
          merchantName: t.merchant_name ?? null,
          amountCents,
          direction,
        },
      });
      added += 1;

      if (
        direction === BankTransactionDirection.INCOMING &&
        txn.matchStatus === BankTransactionMatchStatus.UNMATCHED
      ) {
        const result = await this.tryAutoMatch(organizationId, txn.id);
        if (result.autoMatched) autoMatched += 1;
      }
    }

    for (const t of sync.modified) {
      const acct = accountByPlaidId.get(t.account_id);
      if (!acct) continue;
      const direction =
        t.amount < 0
          ? BankTransactionDirection.INCOMING
          : BankTransactionDirection.OUTGOING;
      const amountCents = Math.round(Math.abs(t.amount) * 100);
      await this.prisma.bankTransaction
        .update({
          where: {
            bankAccountId_externalId: {
              bankAccountId: acct.id,
              externalId: t.transaction_id,
            },
          },
          data: {
            amountCents,
            direction,
            description: t.name ?? 'Bank transaction',
            date: new Date(t.date),
          },
        })
        .catch(() => undefined);
    }

    for (const r of sync.removed) {
      if (!r.transaction_id) continue;
      await this.prisma.bankTransaction
        .deleteMany({
          where: { externalId: r.transaction_id },
        })
        .catch(() => undefined);
    }

    // Update cursor and sync timestamp on every account in this item
    await this.prisma.bankAccount.updateMany({
      where: { plaidItemId, organizationId },
      data: {
        plaidCursor: sync.nextCursor,
        lastSyncedAt: new Date(),
      },
    });

    // Refresh balances
    try {
      const fresh = await this.plaid.getAccounts(accessToken);
      for (const a of fresh) {
        const local = accountByPlaidId.get(a.account_id);
        if (!local) continue;
        await this.prisma.bankAccount.update({
          where: { id: local.id },
          data: {
            currentBalanceCents: this.dollarsToCents(
              a.balances.current ?? a.balances.available ?? 0,
            ),
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to refresh balances: ${err instanceof Error ? err.message : err}`,
      );
    }

    return {
      added,
      modified: sync.modified.length,
      removed: sync.removed.length,
      autoMatched,
    };
  }

  // ──────────────────────────────────────
  // Manual transactions (Venmo/Cashapp/Zelle add-by-hand)
  // ──────────────────────────────────────

  async createManualTransaction(
    organizationId: string,
    dto: CreateManualTransactionDto,
  ) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, organizationId },
    });
    if (!account) throw new NotFoundException('Bank account not found');

    const txn = await this.prisma.bankTransaction.create({
      data: {
        organizationId,
        bankAccountId: dto.bankAccountId,
        direction: dto.direction,
        amountCents: dto.amountCents,
        description: dto.description,
        counterpartyName: dto.counterpartyName ?? null,
        date: new Date(dto.date),
        notes: dto.notes ?? null,
      },
    });

    await this.adjustAccountBalance(account.id, dto.direction, dto.amountCents);

    let autoMatched = false;
    if (dto.direction === BankTransactionDirection.INCOMING) {
      const result = await this.tryAutoMatch(organizationId, txn.id);
      autoMatched = result.autoMatched;
    }

    return { transaction: txn, autoMatched };
  }

  async importCsv(organizationId: string, dto: ImportCsvDto) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: dto.bankAccountId, organizationId },
    });
    if (!account) throw new NotFoundException('Bank account not found');

    let added = 0;
    let autoMatched = 0;
    let balanceDelta = 0;

    for (const row of dto.rows) {
      // Avoid dupes if externalId is present
      if (row.externalId) {
        const existing = await this.prisma.bankTransaction.findUnique({
          where: {
            bankAccountId_externalId: {
              bankAccountId: dto.bankAccountId,
              externalId: row.externalId,
            },
          },
        });
        if (existing) continue;
      }

      const txn = await this.prisma.bankTransaction.create({
        data: {
          organizationId,
          bankAccountId: dto.bankAccountId,
          externalId: row.externalId ?? null,
          direction: row.direction,
          amountCents: row.amountCents,
          description: row.description,
          counterpartyName: row.counterpartyName ?? null,
          date: new Date(row.date),
        },
      });
      added += 1;
      balanceDelta +=
        row.direction === BankTransactionDirection.INCOMING
          ? row.amountCents
          : -row.amountCents;

      if (row.direction === BankTransactionDirection.INCOMING) {
        const result = await this.tryAutoMatch(organizationId, txn.id);
        if (result.autoMatched) autoMatched += 1;
      }
    }

    if (balanceDelta !== 0) {
      await this.prisma.bankAccount.update({
        where: { id: dto.bankAccountId },
        data: {
          currentBalanceCents: { increment: balanceDelta },
          lastSyncedAt: new Date(),
        },
      });
    }

    return { added, autoMatched };
  }

  private async adjustAccountBalance(
    accountId: string,
    direction: BankTransactionDirection,
    amountCents: number,
  ) {
    const delta =
      direction === BankTransactionDirection.INCOMING
        ? amountCents
        : -amountCents;
    await this.prisma.bankAccount.update({
      where: { id: accountId },
      data: { currentBalanceCents: { increment: delta } },
    });
  }

  // ──────────────────────────────────────
  // Auto-match
  // ──────────────────────────────────────

  private async tryAutoMatch(
    organizationId: string,
    txnId: string,
  ): Promise<{ autoMatched: boolean }> {
    const txn = await this.prisma.bankTransaction.findUnique({
      where: { id: txnId },
    });
    if (
      !txn ||
      txn.direction !== BankTransactionDirection.INCOMING ||
      txn.matchStatus !== BankTransactionMatchStatus.UNMATCHED
    ) {
      return { autoMatched: false };
    }

    // Pull candidate unpaid payments for this org, due within ±60 days.
    const start = new Date(txn.date);
    start.setDate(start.getDate() - 60);
    const end = new Date(txn.date);
    end.setDate(end.getDate() + 30);

    const candidates = await this.prisma.payment.findMany({
      where: {
        lease: { organizationId },
        paidAt: null,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        dueDate: { gte: start, lte: end },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
      take: 100,
    });

    if (candidates.length === 0) return { autoMatched: false };

    const matchable: MatchablePayment[] = candidates.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      dueDate: p.dueDate,
      tenantName: p.lease.tenant.name,
      tenantEmail: p.lease.tenant.email,
      unitNumber: p.lease.unit.unitNumber,
      propertyName: p.lease.unit.property.name,
    }));

    const txnInput: MatchableTransaction = {
      amountCents: txn.amountCents,
      description: txn.description,
      counterpartyName: txn.counterpartyName,
      date: txn.date,
    };

    const { autoMatch, suggestion } = this.matcher.pickBestMatch(
      txnInput,
      matchable,
    );

    if (autoMatch) {
      await this.applyMatch(organizationId, txnId, autoMatch.payment.id, {
        automatic: true,
        reasons: autoMatch.reasons,
      });
      return { autoMatched: true };
    }

    // No auto-match but we have a suggestion → flag for review
    if (suggestion) {
      await this.prisma.bankTransaction.update({
        where: { id: txnId },
        data: {
          matchStatus: BankTransactionMatchStatus.REVIEW,
          notes: `Suggested match: ${suggestion.payment.tenantName} (${suggestion.payment.propertyName} #${suggestion.payment.unitNumber}) — score ${suggestion.score}\n${suggestion.reasons.join(', ')}`,
        },
      });
    }
    return { autoMatched: false };
  }

  /**
   * Manual match (admin clicked "match this transaction to that payment").
   */
  async matchTransaction(
    organizationId: string,
    txnId: string,
    paymentId: string,
  ) {
    return this.applyMatch(organizationId, txnId, paymentId, {
      automatic: false,
    });
  }

  private async applyMatch(
    organizationId: string,
    txnId: string,
    paymentId: string,
    opts: { automatic: boolean; reasons?: string[] },
  ) {
    const txn = await this.prisma.bankTransaction.findFirst({
      where: { id: txnId, organizationId },
      include: { bankAccount: true },
    });
    if (!txn) throw new NotFoundException('Bank transaction not found');

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, lease: { organizationId } },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.paidAt) {
      throw new BadRequestException('That payment is already marked paid');
    }

    const noteSuffix = opts.automatic
      ? `Auto-matched to bank txn ${txn.id} (${txn.bankAccount.name})${opts.reasons?.length ? '\nReasons: ' + opts.reasons.join(', ') : ''}`
      : `Manually matched to bank txn ${txn.id} (${txn.bankAccount.name})`;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: txn.date,
        method: this.methodForAccount(txn.bankAccount.name),
        notes: [payment.notes, noteSuffix].filter(Boolean).join('\n'),
      },
    });

    await this.prisma.bankTransaction.update({
      where: { id: txnId },
      data: {
        matchStatus: BankTransactionMatchStatus.MATCHED,
        matchedPaymentId: paymentId,
        matchedAt: new Date(),
        matchedAutomatically: opts.automatic,
      },
    });

    // Create income transaction in the financial ledger
    await this.prisma.transaction.create({
      data: {
        organizationId,
        propertyId: payment.lease.unit.propertyId,
        type: 'INCOME',
        category: 'Rent',
        description: `Rent — ${payment.lease.tenant.name} — ${payment.lease.unit.property.name} Unit ${payment.lease.unit.unitNumber} (${opts.automatic ? 'auto-matched' : 'matched'} from ${txn.bankAccount.name})`,
        amountCents: payment.amountCents,
        date: txn.date,
      },
    });

    // Notify owners
    const owners = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT'] },
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    for (const owner of owners) {
      await this.prisma.notification.create({
        data: {
          organizationId,
          userId: owner.id,
          type: opts.automatic
            ? NotificationType.PAYMENT_AUTO_MATCHED
            : NotificationType.GENERAL,
          title: opts.automatic
            ? `Auto-matched rent: ${payment.lease.tenant.name}`
            : `Rent matched: ${payment.lease.tenant.name}`,
          message: `$${(payment.amountCents / 100).toFixed(
            2,
          )} from ${payment.lease.tenant.name} for ${payment.lease.unit.property.name} Unit ${payment.lease.unit.unitNumber} via ${txn.bankAccount.name}.`,
          linkUrl: `/banking`,
        },
      });
    }

    if (opts.automatic && owners.length > 0) {
      const frontend =
        this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() ??
        'http://localhost:3000';
      for (const owner of owners) {
        this.email
          .sendNotification(owner.email, {
            recipientName: owner.name,
            notificationTitle: `Rent auto-matched: ${payment.lease.tenant.name}`,
            notificationBody: `Casa Meni automatically matched a $${(payment.amountCents / 100).toFixed(2)} deposit in ${txn.bankAccount.name} to ${payment.lease.tenant.name}'s rent (${payment.lease.unit.property.name} Unit ${payment.lease.unit.unitNumber}).${opts.reasons?.length ? `\n\nWhy we matched: ${opts.reasons.join(', ')}.` : ''}`,
            actionUrl: `${frontend.replace(/\/$/, '')}/banking`,
            actionLabel: 'Review match',
          })
          .catch((err) =>
            this.logger.warn(
              `Failed to email auto-match notification: ${err instanceof Error ? err.message : err}`,
            ),
          );
      }
    }

    return { ok: true };
  }

  private methodForAccount(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('cash')) return 'cashapp';
    if (n.includes('venmo')) return 'venmo';
    if (n.includes('zelle')) return 'zelle';
    if (n.includes('chime')) return 'chime';
    return 'bank';
  }

  async unmatchTransaction(organizationId: string, txnId: string) {
    const txn = await this.prisma.bankTransaction.findFirst({
      where: { id: txnId, organizationId },
    });
    if (!txn) throw new NotFoundException('Bank transaction not found');
    if (!txn.matchedPaymentId) {
      throw new BadRequestException('Transaction is not matched');
    }
    const paymentId = txn.matchedPaymentId;

    await this.prisma.bankTransaction.update({
      where: { id: txnId },
      data: {
        matchStatus: BankTransactionMatchStatus.UNMATCHED,
        matchedPaymentId: null,
        matchedAt: null,
        matchedAutomatically: false,
      },
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PENDING,
        paidAt: null,
      },
    });

    return { ok: true };
  }

  async ignoreTransaction(organizationId: string, txnId: string) {
    const txn = await this.prisma.bankTransaction.findFirst({
      where: { id: txnId, organizationId },
    });
    if (!txn) throw new NotFoundException('Bank transaction not found');
    return this.prisma.bankTransaction.update({
      where: { id: txnId },
      data: { matchStatus: BankTransactionMatchStatus.IGNORED },
    });
  }

  async listUnpaidPayments(organizationId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        lease: { organizationId },
        paidAt: null,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
      },
      include: {
        lease: {
          include: {
            tenant: { select: { id: true, name: true, email: true } },
            unit: {
              select: {
                unitNumber: true,
                property: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    });
    return payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      dueDate: p.dueDate,
      tenantName: p.lease.tenant.name,
      propertyName: p.lease.unit.property.name,
      unitNumber: p.lease.unit.unitNumber,
    }));
  }

  async disconnectAccount(organizationId: string, accountId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, organizationId },
    });
    if (!account) throw new NotFoundException('Bank account not found');

    if (
      account.provider === BankAccountProvider.PLAID &&
      account.plaidAccessToken
    ) {
      await this.plaid.removeItem(account.plaidAccessToken);
    }
    await this.prisma.bankAccount.update({
      where: { id: account.id },
      data: { isActive: false, plaidAccessToken: null },
    });
    return { ok: true };
  }
}
