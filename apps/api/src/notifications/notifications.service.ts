import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { QueueService } from '../queue/queue.service';
import { NotificationType } from '@prisma/client';

const EMAILABLE_TYPES: NotificationType[] = [
  NotificationType.PAYMENT_OVERDUE,
  NotificationType.LEASE_EXPIRING,
  NotificationType.RENOVATION_BUDGET,
];

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly queue: QueueService,
  ) {}

  async onModuleInit() {
    this.queue.registerWorker('generate-alerts', async (payload) => {
      if (payload.organizationId) {
        await this.generateAlerts(payload.organizationId);
      } else {
        // Run for every org
        const orgs = await this.prisma.organization.findMany({
          select: { id: true },
        });
        for (const o of orgs) {
          try {
            await this.generateAlerts(o.id);
          } catch (err) {
            this.logger.error(
              `Alert generation failed for org ${o.id}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
    });

    // Run every hour at :05
    await this.queue.scheduleRecurring(
      'generate-alerts',
      {},
      { pattern: '5 * * * *' },
    );
  }

  /** Public helper — enqueue alerts for one org or all. */
  async enqueueAlerts(organizationId?: string) {
    await this.queue.enqueue(
      'generate-alerts',
      organizationId ? { organizationId } : {},
      {},
      async (payload) => {
        if (payload.organizationId) {
          await this.generateAlerts(payload.organizationId);
        }
      },
    );
  }

  private getFrontendUrl(): string {
    const url =
      this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() ||
      'http://localhost:3000';
    return url.replace(/\/$/, '');
  }

  private async emailNotification(args: {
    organizationId: string;
    userId: string | null;
    type: NotificationType;
    title: string;
    message: string;
    linkUrl: string | null;
  }) {
    if (!EMAILABLE_TYPES.includes(args.type)) return;

    let recipients: { email: string; name: string }[] = [];
    if (args.userId) {
      const u = await this.prisma.user.findUnique({
        where: { id: args.userId },
        select: { email: true, name: true },
      });
      if (u) recipients = [u];
    } else {
      recipients = await this.prisma.user.findMany({
        where: {
          organizationId: args.organizationId,
          role: { in: ['OWNER', 'PROPERTY_MANAGER'] },
          isActive: true,
        },
        select: { email: true, name: true },
      });
    }

    if (recipients.length === 0) return;

    const frontendUrl = this.getFrontendUrl();
    const actionUrl = args.linkUrl
      ? `${frontendUrl}${args.linkUrl}`
      : undefined;

    for (const r of recipients) {
      this.email
        .sendNotification(r.email, {
          recipientName: r.name,
          notificationTitle: args.title,
          notificationBody: args.message,
          actionUrl,
          actionLabel: actionUrl ? 'Open in Casa Meni' : undefined,
        })
        .catch((err) =>
          this.logger.error(`Failed to send notification email: ${err}`),
        );
    }
  }

  async findAll(organizationId: string, userId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: {
        organizationId,
        OR: [{ userId }, { userId: null }],
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(organizationId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        organizationId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
    });
    return { unreadCount: count };
  }

  async markRead(organizationId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, organizationId },
      data: { isRead: true },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        organizationId,
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async generateAlerts(organizationId: string) {
    const now = new Date();
    const created: string[] = [];

    const overduePayments = await this.prisma.payment.findMany({
      where: {
        lease: { organizationId },
        paidAt: null,
        dueDate: { lt: now },
      },
      include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
    });

    for (const p of overduePayments) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          organizationId,
          type: 'PAYMENT_OVERDUE',
          message: { contains: p.id },
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!exists) {
        const title = `Overdue rent: ${p.lease.tenant.name}`;
        const message = `$${(p.amountCents / 100).toFixed(2)} was due ${p.dueDate.toLocaleDateString()} for ${p.lease.unit.property.name} Unit ${p.lease.unit.unitNumber}. Payment ID: ${p.id}`;
        const linkUrl = `/tenants/leases/${p.lease.id}`;
        await this.prisma.notification.create({
          data: {
            organizationId,
            type: NotificationType.PAYMENT_OVERDUE,
            title,
            message,
            linkUrl,
          },
        });
        await this.emailNotification({
          organizationId,
          userId: null,
          type: NotificationType.PAYMENT_OVERDUE,
          title,
          message,
          linkUrl,
        });
        created.push(`overdue-${p.id}`);
      }
    }

    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringLeases = await this.prisma.lease.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        endDate: { lte: thirtyDaysOut, gte: now },
      },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    for (const l of expiringLeases) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          organizationId,
          type: 'LEASE_EXPIRING',
          message: { contains: l.id },
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      if (!exists) {
        const daysLeft = Math.ceil((l.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const title = `Lease expiring in ${daysLeft} days`;
        const message = `${l.tenant.name}'s lease at ${l.unit.property.name} Unit ${l.unit.unitNumber} expires ${l.endDate.toLocaleDateString()}. Lease ID: ${l.id}`;
        const linkUrl = `/tenants/leases/${l.id}`;
        await this.prisma.notification.create({
          data: {
            organizationId,
            type: NotificationType.LEASE_EXPIRING,
            title,
            message,
            linkUrl,
          },
        });
        await this.emailNotification({
          organizationId,
          userId: null,
          type: NotificationType.LEASE_EXPIRING,
          title,
          message,
          linkUrl,
        });
        created.push(`lease-${l.id}`);
      }
    }

    const openJobs = await this.prisma.maintenanceJob.findMany({
      where: {
        organizationId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] },
        createdAt: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
      },
      include: { property: true },
    });

    for (const j of openJobs) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          organizationId,
          type: 'MAINTENANCE_UPDATE',
          message: { contains: j.id },
          createdAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
      });
      if (!exists) {
        const daysOpen = Math.ceil((now.getTime() - j.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        await this.prisma.notification.create({
          data: {
            organizationId,
            type: NotificationType.MAINTENANCE_UPDATE,
            title: `Work order open ${daysOpen} days: ${j.title}`,
            message: `${j.property.name} — Priority: ${j.priority}, Status: ${j.status}. Job ID: ${j.id}`,
            linkUrl: `/maintenance`,
          },
        });
        created.push(`maintenance-${j.id}`);
      }
    }

    const overBudget = await this.prisma.renovation.findMany({
      where: {
        property: { organizationId },
        status: 'IN_PROGRESS',
      },
    });

    for (const r of overBudget) {
      const pct = r.budgetCents > 0 ? (r.actualCostCents / r.budgetCents) * 100 : 0;
      if (pct >= 90) {
        const exists = await this.prisma.notification.findFirst({
          where: {
            organizationId,
            type: 'RENOVATION_BUDGET',
            message: { contains: r.id },
            createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (!exists) {
          const title = `Renovation at ${Math.round(pct)}% of budget`;
          const message = `"${r.name}" has spent $${(r.actualCostCents / 100).toFixed(2)} of $${(r.budgetCents / 100).toFixed(2)} budget. Renovation ID: ${r.id}`;
          const linkUrl = `/renovations/${r.id}`;
          await this.prisma.notification.create({
            data: {
              organizationId,
              type: NotificationType.RENOVATION_BUDGET,
              title,
              message,
              linkUrl,
            },
          });
          await this.emailNotification({
            organizationId,
            userId: null,
            type: NotificationType.RENOVATION_BUDGET,
            title,
            message,
            linkUrl,
          });
          created.push(`reno-${r.id}`);
        }
      }
    }

    return { alertsGenerated: created.length, alerts: created };
  }
}
