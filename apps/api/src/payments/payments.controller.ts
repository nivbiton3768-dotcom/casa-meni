import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { StripeService } from '../stripe/stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('settings')
  getSettings() {
    return this.service.getPaymentSettings();
  }

  @Post(':id/checkout')
  createCheckout(
    @CurrentUser('id') userId: string,
    @Param('id') paymentId: string,
  ) {
    return this.service.createCheckoutForTenant(userId, paymentId);
  }

  @Get('session/:sessionId')
  getSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getSessionResult(userId, sessionId);
  }

  @Get('autopay/:leaseId')
  getAutopay(
    @CurrentUser('id') userId: string,
    @Param('leaseId') leaseId: string,
  ) {
    return this.service.getAutopayStatus(userId, leaseId);
  }

  @Post('autopay/:leaseId/setup')
  startAutopay(
    @CurrentUser('id') userId: string,
    @Param('leaseId') leaseId: string,
  ) {
    return this.service.startAutopaySetup(userId, leaseId);
  }

  @Post('autopay/:leaseId/confirm')
  confirmAutopay(
    @CurrentUser('id') userId: string,
    @Param('leaseId') leaseId: string,
    @Body() body: { paymentMethodId: string; dayOfMonth: number },
  ) {
    return this.service.confirmAutopay({
      userId,
      leaseId,
      paymentMethodId: body.paymentMethodId,
      dayOfMonth: body.dayOfMonth,
    });
  }

  @Post('autopay/:leaseId/cancel')
  cancelAutopay(
    @CurrentUser('id') userId: string,
    @Param('leaseId') leaseId: string,
  ) {
    return this.service.cancelAutopay(userId, leaseId);
  }
}

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly service: PaymentsService,
    private readonly stripe: StripeService,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available for verification');
    }

    let event;
    try {
      event = this.stripe.verifyWebhook(rawBody, signature);
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err instanceof Error ? err.message : err}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    try {
      await this.service.handleStripeEvent(event);
    } catch (err) {
      this.logger.error(
        `Error handling Stripe event ${event.type}: ${err instanceof Error ? err.message : err}`,
      );
    }

    return { received: true };
  }
}
