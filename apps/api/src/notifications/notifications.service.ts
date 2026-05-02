import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
        await this.prisma.notification.create({
          data: {
            organizationId,
            type: NotificationType.PAYMENT_OVERDUE,
            title: `Overdue rent: ${p.lease.tenant.name}`,
            message: `$${(p.amountCents / 100).toFixed(2)} was due ${p.dueDate.toLocaleDateString()} for ${p.lease.unit.property.name} Unit ${p.lease.unit.unitNumber}. Payment ID: ${p.id}`,
            linkUrl: `/tenants/leases/${p.lease.id}`,
          },
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
        await this.prisma.notification.create({
          data: {
            organizationId,
            type: NotificationType.LEASE_EXPIRING,
            title: `Lease expiring in ${daysLeft} days`,
            message: `${l.tenant.name}'s lease at ${l.unit.property.name} Unit ${l.unit.unitNumber} expires ${l.endDate.toLocaleDateString()}. Lease ID: ${l.id}`,
            linkUrl: `/tenants/leases/${l.id}`,
          },
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
          await this.prisma.notification.create({
            data: {
              organizationId,
              type: NotificationType.RENOVATION_BUDGET,
              title: `Renovation at ${Math.round(pct)}% of budget`,
              message: `"${r.name}" has spent $${(r.actualCostCents / 100).toFixed(2)} of $${(r.budgetCents / 100).toFixed(2)} budget. Renovation ID: ${r.id}`,
              linkUrl: `/renovations/${r.id}`,
            },
          });
          created.push(`reno-${r.id}`);
        }
      }
    }

    return { alertsGenerated: created.length, alerts: created };
  }
}
