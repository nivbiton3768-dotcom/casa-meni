import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { EmailService } from '../email/email.service';
import { QueueService } from '../queue/queue.service';
import { PaymentStatus, NotificationType } from '@prisma/client';
import type Stripe from 'stripe';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit() {
    this.queue.registerWorker('run-autopay-charges', async (payload) => {
      const date = payload.date ? new Date(payload.date) : new Date();
      const r = await this.runAutopayCharges(date);
      this.logger.log(
        `Autopay run: ${r.charged} charged, ${r.failed} failed`,
      );
    });
    this.queue.registerWorker('apply-late-fees', async () => {
      const r = await this.applyLateFees();
      this.logger.log(`Late fees applied to ${r.affected} payments`);
    });

    // Daily 9:00 UTC for both. Idempotent — re-runs won't double-charge or
    // double-fee because of the paid/notes guards.
    await this.queue.scheduleRecurring(
      'run-autopay-charges',
      {},
      { pattern: '0 9 * * *' },
    );
    await this.queue.scheduleRecurring(
      'apply-late-fees',
      {},
      { pattern: '15 9 * * *' },
    );
  }

  /**
   * Apply late fees per lease policy. Looks at all unpaid payments past the
   * grace period and adds notes + bumps balances accordingly.
   */
  async applyLateFees() {
    const today = new Date();
    const overdue = await this.prisma.payment.findMany({
      where: {
        paidAt: null,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
      },
      include: { lease: true },
    });

    let affected = 0;
    for (const p of overdue) {
      const lease = p.lease;
      const graceUntil = new Date(p.dueDate);
      graceUntil.setDate(graceUntil.getDate() + (lease.gracePeriodDays ?? 5));
      if (today < graceUntil) continue;

      // Idempotency: skip if we've already added a late fee note today.
      const todayKey = today.toISOString().slice(0, 10);
      if (p.notes?.includes(`Late fee applied ${todayKey}`)) continue;
      // Skip if any late fee note already exists (one-time fee per missed payment).
      if (p.notes?.includes('Late fee applied')) continue;

      const flat = lease.lateFeeFlatCents ?? 0;
      const bps = lease.lateFeePercentBps ?? 0;
      const pct = Math.round((p.amountCents * bps) / 10000);
      const fee = flat + pct;
      if (fee <= 0) continue;

      await this.prisma.payment.update({
        where: { id: p.id },
        data: {
          feesCents: (p.feesCents ?? 0) + fee,
          notes: [
            p.notes,
            `Late fee applied ${todayKey}: $${(fee / 100).toFixed(2)} (flat $${(flat / 100).toFixed(2)} + ${(bps / 100).toFixed(2)}%)`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      });
      affected += 1;
    }
    return { affected };
  }

  async createCheckoutForTenant(userId: string, paymentId: string) {
    if (!this.stripe.enabled) {
      throw new BadRequestException(
        'Online payments are not enabled. Please contact your property manager.',
      );
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, lease: { tenantId: userId } },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.paidAt) {
      throw new BadRequestException('This payment is already paid');
    }
    if (payment.status === PaymentStatus.PROCESSING) {
      throw new BadRequestException(
        'A payment for this is already being processed',
      );
    }

    const description = `Rent — ${payment.lease.unit.property.name} Unit ${payment.lease.unit.unitNumber} — Due ${payment.dueDate.toLocaleDateString()}`;

    const { url, sessionId } = await this.stripe.createCheckoutSession({
      paymentId: payment.id,
      amountCents: payment.amountCents,
      description,
      customerEmail: payment.lease.tenant.email,
      successPath: `/portal/payments/success`,
      cancelPath: `/portal/payments`,
      metadata: {
        paymentId: payment.id,
        leaseId: payment.leaseId,
        tenantId: payment.lease.tenantId,
        organizationId: payment.lease.organizationId,
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeCheckoutSessionId: sessionId,
        status: PaymentStatus.PROCESSING,
        method: 'stripe',
      },
    });

    return { url };
  }

  async getSessionResult(userId: string, sessionId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        stripeCheckoutSessionId: sessionId,
        lease: { tenantId: userId },
      },
      include: {
        lease: { include: { unit: { include: { property: true } } } },
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment session not found');
    }
    return {
      payment: {
        id: payment.id,
        amountCents: payment.amountCents,
        status: payment.status,
        paidAt: payment.paidAt,
        receiptUrl: payment.stripeReceiptUrl,
        propertyName: payment.lease.unit.property.name,
        unitNumber: payment.lease.unit.unitNumber,
        dueDate: payment.dueDate,
      },
    };
  }

  async handleStripeEvent(event: Stripe.Event) {
    this.logger.log(`Stripe event received: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.handleCheckoutCompleted(session);
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.handleCheckoutExpired(session);
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      await this.handleRefund(charge);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) {
      this.logger.warn(
        `checkout.session.completed missing paymentId metadata: ${session.id}`,
      );
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });
    if (!payment) {
      this.logger.warn(`Payment not found for session ${session.id}`);
      return;
    }
    if (payment.paidAt) {
      this.logger.log(`Payment ${payment.id} already marked paid; skipping`);
      return;
    }

    const fullSession = await this.stripe.retrieveSession(session.id);
    const intent = fullSession.payment_intent as
      | Stripe.PaymentIntent
      | string
      | null;
    const intentId =
      typeof intent === 'string' ? intent : intent?.id ?? null;
    const charge =
      typeof intent === 'object' && intent && 'latest_charge' in intent
        ? (intent.latest_charge as Stripe.Charge | string | null)
        : null;
    const receiptUrl =
      typeof charge === 'object' && charge ? charge.receipt_url : null;
    const feeCents = session.amount_total ?? payment.amountCents;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        method: session.payment_method_types?.[0] ?? 'stripe',
        stripePaymentId: intentId,
        stripeReceiptUrl: receiptUrl,
        feesCents: feeCents,
      },
    });

    await this.prisma.transaction.create({
      data: {
        organizationId: payment.lease.organizationId,
        propertyId: payment.lease.unit.propertyId,
        type: 'INCOME',
        category: 'Rent',
        description: `Rent — ${payment.lease.tenant.name} — ${payment.lease.unit.property.name} Unit ${payment.lease.unit.unitNumber}`,
        amountCents: payment.amountCents,
        date: new Date(),
        receiptUrl: receiptUrl ?? undefined,
      },
    });

    const owners = await this.prisma.user.findMany({
      where: {
        organizationId: payment.lease.organizationId,
        role: { in: ['OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT'] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const owner of owners) {
      await this.prisma.notification.create({
        data: {
          organizationId: payment.lease.organizationId,
          userId: owner.id,
          type: NotificationType.GENERAL,
          title: `Rent paid: ${payment.lease.tenant.name}`,
          message: `$${(payment.amountCents / 100).toFixed(2)} received from ${payment.lease.tenant.name} for ${payment.lease.unit.property.name} Unit ${payment.lease.unit.unitNumber}.`,
          linkUrl: `/transactions`,
        },
      });
    }

    this.email
      .sendNotification(payment.lease.tenant.email, {
        recipientName: payment.lease.tenant.name,
        notificationTitle: 'Rent payment received — thank you!',
        notificationBody: `We received your payment of $${(
          payment.amountCents / 100
        ).toFixed(2)} for ${payment.lease.unit.property.name} Unit ${
          payment.lease.unit.unitNumber
        }.${receiptUrl ? '\n\nDownload your receipt below.' : ''}`,
        actionUrl: receiptUrl ?? undefined,
        actionLabel: receiptUrl ? 'Download Receipt' : undefined,
      })
      .catch((err) =>
        this.logger.error(`Failed to send tenant receipt email: ${err}`),
      );

    this.logger.log(`Marked payment ${payment.id} as paid`);
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session) {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) return;
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.paidAt) return;
    if (payment.status === PaymentStatus.PROCESSING) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PENDING,
          stripeCheckoutSessionId: null,
        },
      });
    }
  }

  private async handleRefund(charge: Stripe.Charge) {
    const intentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!intentId) return;
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentId: intentId },
    });
    if (!payment) return;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        notes: [payment.notes, `Refunded via Stripe: ${charge.id}`]
          .filter(Boolean)
          .join('\n'),
      },
    });
  }

  async getPaymentSettings() {
    const publishableKey = this.config.get<string>('STRIPE_PUBLISHABLE_KEY');
    return {
      enabled: this.stripe.enabled,
      publishableKey: publishableKey ?? null,
    };
  }

  // ──────────────────────────────────────
  // Auto-pay
  // ──────────────────────────────────────

  async startAutopaySetup(userId: string, leaseId: string) {
    if (!this.stripe.enabled) {
      throw new BadRequestException(
        'Online payments are not enabled. Please contact your property manager.',
      );
    }

    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, tenantId: userId },
      include: { tenant: true, organization: true, unit: { include: { property: true } } },
    });
    if (!lease) throw new NotFoundException('Lease not found');

    const customerId = await this.stripe.getOrCreateCustomer({
      existingCustomerId: lease.stripeCustomerId,
      email: lease.tenant.email,
      name: lease.tenant.name,
      metadata: {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        organizationId: lease.organizationId,
      },
    });

    if (customerId !== lease.stripeCustomerId) {
      await this.prisma.lease.update({
        where: { id: lease.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const intent = await this.stripe.createSetupIntent(customerId);
    return {
      clientSecret: intent.clientSecret,
      setupIntentId: intent.id,
    };
  }

  async confirmAutopay(args: {
    userId: string;
    leaseId: string;
    paymentMethodId: string;
    dayOfMonth: number;
  }) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: args.leaseId, tenantId: args.userId },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (!lease.stripeCustomerId) {
      throw new BadRequestException(
        'Run setup first to create a Stripe customer',
      );
    }
    if (args.dayOfMonth < 1 || args.dayOfMonth > 28) {
      throw new BadRequestException('Day of month must be 1–28');
    }

    const meta = await this.stripe.retrievePaymentMethod(args.paymentMethodId);

    // Detach old method if replacing
    if (
      lease.stripePaymentMethodId &&
      lease.stripePaymentMethodId !== args.paymentMethodId
    ) {
      await this.stripe.detachPaymentMethod(lease.stripePaymentMethodId);
    }

    const updated = await this.prisma.lease.update({
      where: { id: lease.id },
      data: {
        autopayEnabled: true,
        autopayDayOfMonth: args.dayOfMonth,
        stripePaymentMethodId: args.paymentMethodId,
        autopayMethodLast4: meta.last4,
        autopayMethodBrand: meta.brand,
        autopayEnabledAt: new Date(),
      },
    });

    return {
      enabled: updated.autopayEnabled,
      dayOfMonth: updated.autopayDayOfMonth,
      methodLast4: updated.autopayMethodLast4,
      methodBrand: updated.autopayMethodBrand,
    };
  }

  async cancelAutopay(userId: string, leaseId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, tenantId: userId },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.stripePaymentMethodId) {
      await this.stripe.detachPaymentMethod(lease.stripePaymentMethodId);
    }
    await this.prisma.lease.update({
      where: { id: lease.id },
      data: {
        autopayEnabled: false,
        stripePaymentMethodId: null,
        autopayMethodLast4: null,
        autopayMethodBrand: null,
      },
    });
    return { ok: true };
  }

  async getAutopayStatus(userId: string, leaseId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, tenantId: userId },
      select: {
        autopayEnabled: true,
        autopayDayOfMonth: true,
        autopayMethodBrand: true,
        autopayMethodLast4: true,
        autopayEnabledAt: true,
      },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  /**
   * Run by a scheduled worker — find payments due today on auto-pay leases
   * and charge them off-session.
   */
  async runAutopayCharges(targetDate: Date = new Date()) {
    if (!this.stripe.enabled) return { charged: 0, failed: 0, skipped: 0 };

    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const due = await this.prisma.payment.findMany({
      where: {
        paidAt: null,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        dueDate: { gte: startOfDay, lt: endOfDay },
        lease: {
          autopayEnabled: true,
          stripePaymentMethodId: { not: null },
        },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
    });

    let charged = 0;
    let failed = 0;

    for (const p of due) {
      const lease = p.lease;
      if (!lease.stripeCustomerId || !lease.stripePaymentMethodId) continue;
      try {
        const result = await this.stripe.createOffSessionPayment({
          customerId: lease.stripeCustomerId,
          paymentMethodId: lease.stripePaymentMethodId,
          amountCents: p.amountCents,
          description: `Auto-pay rent — ${lease.unit.property.name} Unit ${lease.unit.unitNumber}`,
          metadata: {
            paymentId: p.id,
            leaseId: lease.id,
            tenantId: lease.tenantId,
            organizationId: lease.organizationId,
            autopay: 'true',
          },
        });

        if (result.status === 'succeeded') {
          await this.prisma.payment.update({
            where: { id: p.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(),
              method: 'stripe-autopay',
              stripePaymentId: result.id,
              stripeReceiptUrl: result.receiptUrl,
            },
          });
          await this.prisma.transaction.create({
            data: {
              organizationId: lease.organizationId,
              propertyId: lease.unit.propertyId,
              type: 'INCOME',
              category: 'Rent',
              description: `Auto-pay rent — ${lease.tenant.name} — ${lease.unit.property.name} Unit ${lease.unit.unitNumber}`,
              amountCents: p.amountCents,
              date: new Date(),
              receiptUrl: result.receiptUrl ?? undefined,
            },
          });
          charged += 1;
        } else {
          await this.prisma.payment.update({
            where: { id: p.id },
            data: {
              status: PaymentStatus.FAILED,
              notes: [
                p.notes,
                `Auto-pay status: ${result.status}`,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          });
          failed += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Auto-pay failed for payment ${p.id}: ${message}`);
        await this.prisma.payment.update({
          where: { id: p.id },
          data: {
            status: PaymentStatus.FAILED,
            notes: [p.notes, `Auto-pay error: ${message}`]
              .filter(Boolean)
              .join('\n'),
          },
        });
        // Notify owners that auto-pay bounced
        const owners = await this.prisma.user.findMany({
          where: {
            organizationId: lease.organizationId,
            role: { in: ['OWNER', 'PROPERTY_MANAGER'] },
            isActive: true,
          },
          select: { id: true },
        });
        for (const o of owners) {
          await this.prisma.notification.create({
            data: {
              organizationId: lease.organizationId,
              userId: o.id,
              type: NotificationType.PAYMENT_OVERDUE,
              title: `Auto-pay failed: ${lease.tenant.name}`,
              message: `Auto-pay charge of $${(p.amountCents / 100).toFixed(2)} failed for ${lease.unit.property.name} Unit ${lease.unit.unitNumber}. Reason: ${message}`,
              linkUrl: `/transactions`,
            },
          });
        }
        failed += 1;
      }
    }

    return { charged, failed, skipped: 0 };
  }
}
