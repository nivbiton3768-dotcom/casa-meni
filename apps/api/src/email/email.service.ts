import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  signingRequestEmail,
  signingCompletedEmail,
  signingDeclinedEmail,
  tenantWelcomeEmail,
  notificationEmail,
  SigningRequestEmailVars,
  SigningCompletedEmailVars,
  SigningDeclinedEmailVars,
  TenantWelcomeEmailVars,
  NotificationEmailVars,
} from './templates';
import { QueueService } from '../queue/queue.service';

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly queue: QueueService,
  ) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.from =
      this.config.get<string>('EMAIL_FROM') ||
      'Casa Meni <onboarding@resend.dev>';
    this.enabled = Boolean(apiKey);
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (!this.enabled) {
      this.logger.warn(
        'RESEND_API_KEY not set — emails will be logged to console instead of sent',
      );
    } else {
      this.logger.log(`Email service ready (from: ${this.from})`);
    }
  }

  onModuleInit() {
    this.queue.registerWorker('send-email', async (payload) => {
      await this.actuallySend({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
    });
  }

  private filterRecipients(to: string | string[]): string[] {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.filter(
      (r) => r && r.includes('@') && !r.endsWith('@example.com'),
    );
  }

  private async actuallySend(args: SendArgs): Promise<{ ok: boolean; id?: string }> {
    const validRecipients = this.filterRecipients(args.to);
    if (validRecipients.length === 0) {
      this.logger.debug(
        `Skipping email — no valid recipients: ${(Array.isArray(args.to) ? args.to : [args.to]).join(', ')}`,
      );
      return { ok: false };
    }

    if (!this.enabled || !this.resend) {
      this.logger.log(
        `[email noop] to=${validRecipients.join(',')} subject="${args.subject}"`,
      );
      return { ok: false };
    }

    try {
      const res = await this.resend.emails.send({
        from: this.from,
        to: validRecipients,
        subject: args.subject,
        html: args.html,
        text: args.text,
        replyTo: args.replyTo,
      });
      if (res.error) {
        this.logger.error(`Resend error: ${JSON.stringify(res.error)}`);
        return { ok: false };
      }
      return { ok: true, id: res.data?.id };
    } catch (err) {
      this.logger.error(`Failed to send email: ${err}`);
      return { ok: false };
    }
  }

  /**
   * Enqueue an email for sending. With Redis, runs async with retries; without,
   * runs inline (preserving existing single-process behaviour).
   */
  private async enqueueOrSend(args: SendArgs): Promise<void> {
    const validRecipients = this.filterRecipients(args.to);
    if (validRecipients.length === 0) {
      this.logger.debug('Skipping email — no valid recipients');
      return;
    }
    for (const to of validRecipients) {
      await this.queue.enqueue(
        'send-email',
        {
          to,
          subject: args.subject,
          html: args.html,
          text: args.text,
        },
        {},
        async (payload) => {
          await this.actuallySend({
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
          });
        },
      );
    }
  }

  async sendSigningRequest(to: string, vars: SigningRequestEmailVars) {
    const tpl = signingRequestEmail(vars);
    await this.enqueueOrSend({ to, ...tpl });
  }

  async sendSigningCompleted(to: string, vars: SigningCompletedEmailVars) {
    const tpl = signingCompletedEmail(vars);
    await this.enqueueOrSend({ to, ...tpl });
  }

  async sendSigningDeclined(to: string, vars: SigningDeclinedEmailVars) {
    const tpl = signingDeclinedEmail(vars);
    await this.enqueueOrSend({ to, ...tpl });
  }

  async sendTenantWelcome(to: string, vars: TenantWelcomeEmailVars) {
    const tpl = tenantWelcomeEmail(vars);
    await this.enqueueOrSend({ to, ...tpl });
  }

  async sendNotification(to: string, vars: NotificationEmailVars) {
    const tpl = notificationEmail(vars);
    await this.enqueueOrSend({ to, ...tpl });
  }
}
