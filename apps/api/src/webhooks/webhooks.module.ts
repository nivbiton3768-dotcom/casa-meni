import {
  Body,
  Controller,
  Delete,
  Get,
  Global,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  OnModuleInit,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueueService } from '../queue/queue.service';

const SUPPORTED_EVENTS = [
  'payment.received',
  'payment.overdue',
  'lease.created',
  'lease.terminated',
  'maintenance.created',
  'maintenance.completed',
  'reservation.created',
  'reservation.cancelled',
  'emergency.reported',
  'capital_call.sent',
];

interface CreateSubDto {
  url: string;
  events: string[];
  secret?: string;
}

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  onModuleInit() {
    this.queue.registerWorker('webhook-deliver', async (payload) => {
      await this.deliver(payload.subscriptionId, payload.event, payload.payload);
    });
  }

  async list(organizationId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreateSubDto) {
    const invalid = dto.events.filter((e) => !SUPPORTED_EVENTS.includes(e));
    if (invalid.length > 0) {
      throw new Error(`Unsupported events: ${invalid.join(', ')}`);
    }
    const secret = dto.secret ?? crypto.randomBytes(32).toString('hex');
    return this.prisma.webhookSubscription.create({
      data: {
        organizationId,
        url: dto.url,
        events: dto.events,
        secret,
      },
    });
  }

  async update(organizationId: string, id: string, dto: Partial<CreateSubDto> & { isActive?: boolean }) {
    const sub = await this.prisma.webhookSubscription.findFirst({ where: { id, organizationId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        url: dto.url,
        events: dto.events,
        isActive: dto.isActive,
        secret: dto.secret,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const sub = await this.prisma.webhookSubscription.findFirst({ where: { id, organizationId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.prisma.webhookSubscription.delete({ where: { id } });
    return { ok: true };
  }

  async listDeliveries(organizationId: string, subscriptionId: string) {
    const sub = await this.prisma.webhookSubscription.findFirst({
      where: { id: subscriptionId, organizationId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.webhookDelivery.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Public API: any service can call this to fan out an event. */
  async fire(organizationId: string, event: string, payload: Record<string, unknown>) {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: {
        organizationId,
        isActive: true,
        events: { has: event },
      },
    });
    for (const sub of subs) {
      await this.queue.enqueue(
        'webhook-deliver',
        { subscriptionId: sub.id, event, payload },
        undefined,
        async ({ subscriptionId, event: ev, payload: pl }) => this.deliver(subscriptionId, ev, pl),
      );
    }
  }

  /** Worker: signed POST to subscriber URL, log result. */
  async deliver(subscriptionId: string, event: string, payload: Record<string, unknown>) {
    const sub = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub || !sub.isActive) return;

    const body = JSON.stringify({
      event,
      data: payload,
      timestamp: new Date().toISOString(),
    });
    const signature = crypto
      .createHmac('sha256', sub.secret)
      .update(body)
      .digest('hex');

    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let succeeded = false;
    try {
      const res = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Casa-Meni-Event': event,
          'X-Casa-Meni-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      statusCode = res.status;
      responseBody = (await res.text()).slice(0, 2000);
      succeeded = res.ok;
    } catch (err) {
      responseBody = err instanceof Error ? err.message : String(err);
    }

    await this.prisma.webhookDelivery.create({
      data: {
        subscriptionId,
        event,
        payload: payload as never,
        statusCode,
        responseBody,
        succeeded,
      },
    });
    await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: {
        lastDeliveryAt: new Date(),
        failureCount: succeeded ? 0 : { increment: 1 },
        // Auto-disable after 50 consecutive failures
        ...(sub.failureCount + (succeeded ? 0 : 1) >= 50
          ? { isActive: false }
          : {}),
      },
    });
    if (!succeeded) {
      this.logger.warn(`Webhook ${subscriptionId} failed: status=${statusCode}`);
      throw new Error(`Webhook delivery failed: ${statusCode ?? 'network'}`);
    }
  }
}

@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get('events')
  events() {
    return SUPPORTED_EVENTS;
  }

  @Get()
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.service.list(organizationId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateSubDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateSubDto> & { isActive?: boolean },
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

  @Get(':id/deliveries')
  deliveries(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.listDeliveries(organizationId, id);
  }
}

@Global()
@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
