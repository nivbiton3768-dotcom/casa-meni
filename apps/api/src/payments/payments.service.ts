import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { EmailService } from '../email/email.service';
import { PaymentStatus, NotificationType } from '@prisma/client';
import type Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

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
}
