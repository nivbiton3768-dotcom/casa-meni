import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null;
  public readonly enabled: boolean;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret =
      this.config.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    this.enabled = Boolean(secretKey);

    if (this.enabled && secretKey) {
      this.stripe = new Stripe(secretKey);
      this.logger.log('Stripe service ready');
    } else {
      this.stripe = null;
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — online payments are disabled',
      );
    }
  }

  private getFrontendUrl(): string {
    const url =
      this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() ||
      'http://localhost:3000';
    return url.replace(/\/$/, '');
  }

  async createCheckoutSession(args: {
    paymentId: string;
    amountCents: number;
    description: string;
    customerEmail: string;
    successPath: string;
    cancelPath: string;
    metadata: Record<string, string>;
  }): Promise<{ url: string; sessionId: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }

    const frontend = this.getFrontendUrl();
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      customer_email: args.customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: args.description,
            },
            unit_amount: args.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: args.metadata,
      payment_intent_data: {
        metadata: args.metadata,
        description: args.description,
      },
      success_url: `${frontend}${args.successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}${args.cancelPath}`,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    return { url: session.url, sessionId: session.id };
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) throw new Error('Stripe not configured');
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'payment_intent.latest_charge'],
    });
  }

  verifyWebhook(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) throw new Error('Stripe not configured');
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }

  // ──────────────────────────────────────
  // Auto-pay: SetupIntent + off-session charges
  // ──────────────────────────────────────

  async getOrCreateCustomer(args: {
    existingCustomerId: string | null;
    email: string;
    name: string;
    metadata: Record<string, string>;
  }): Promise<string> {
    if (!this.stripe) throw new Error('Stripe not configured');
    if (args.existingCustomerId) {
      try {
        const c = await this.stripe.customers.retrieve(args.existingCustomerId);
        if (!('deleted' in c) || !c.deleted) return args.existingCustomerId;
      } catch {
        // fall through to create
      }
    }
    const created = await this.stripe.customers.create({
      email: args.email,
      name: args.name,
      metadata: args.metadata,
    });
    return created.id;
  }

  async createSetupIntent(customerId: string): Promise<{
    clientSecret: string;
    id: string;
  }> {
    if (!this.stripe) throw new Error('Stripe not configured');
    const intent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'us_bank_account'],
      usage: 'off_session',
    });
    if (!intent.client_secret) {
      throw new Error('Stripe did not return a client_secret');
    }
    return { clientSecret: intent.client_secret, id: intent.id };
  }

  async retrievePaymentMethod(id: string): Promise<{
    last4: string | null;
    brand: string | null;
    type: string;
  }> {
    if (!this.stripe) throw new Error('Stripe not configured');
    const pm = await this.stripe.paymentMethods.retrieve(id);
    if (pm.card) {
      return {
        last4: pm.card.last4 ?? null,
        brand: pm.card.brand ?? null,
        type: 'card',
      };
    }
    if (pm.us_bank_account) {
      return {
        last4: pm.us_bank_account.last4 ?? null,
        brand: pm.us_bank_account.bank_name ?? 'ACH',
        type: 'us_bank_account',
      };
    }
    return { last4: null, brand: null, type: pm.type };
  }

  async detachPaymentMethod(id: string): Promise<void> {
    if (!this.stripe) return;
    try {
      await this.stripe.paymentMethods.detach(id);
    } catch (err) {
      this.logger.warn(
        `Failed to detach payment method ${id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Charge a saved payment method off-session for auto-pay.
   */
  async createOffSessionPayment(args: {
    customerId: string;
    paymentMethodId: string;
    amountCents: number;
    description: string;
    metadata: Record<string, string>;
  }): Promise<{ id: string; status: string; receiptUrl: string | null }> {
    if (!this.stripe) throw new Error('Stripe not configured');
    const intent = await this.stripe.paymentIntents.create({
      amount: args.amountCents,
      currency: 'usd',
      customer: args.customerId,
      payment_method: args.paymentMethodId,
      off_session: true,
      confirm: true,
      description: args.description,
      metadata: args.metadata,
    });

    let receiptUrl: string | null = null;
    if (typeof intent.latest_charge === 'string') {
      try {
        const ch = await this.stripe.charges.retrieve(intent.latest_charge);
        receiptUrl = ch.receipt_url ?? null;
      } catch {
        // ignore
      }
    } else if (
      intent.latest_charge &&
      typeof intent.latest_charge === 'object'
    ) {
      receiptUrl = (intent.latest_charge as Stripe.Charge).receipt_url ?? null;
    }

    return {
      id: intent.id,
      status: intent.status,
      receiptUrl,
    };
  }
}
