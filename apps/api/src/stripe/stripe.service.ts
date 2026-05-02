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
}
