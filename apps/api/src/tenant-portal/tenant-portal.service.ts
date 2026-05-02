import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, organizationId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: userId, organizationId, status: 'ACTIVE' },
      include: {
        unit: { include: { property: true } },
        payments: { orderBy: { dueDate: 'asc' } },
      },
    });

    const workOrders = await this.prisma.maintenanceJob.findMany({
      where: { createdById: userId, organizationId },
      include: { property: true, unit: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const notifications = await this.prisma.notification.findMany({
      where: {
        organizationId,
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!lease) {
      return {
        lease: null,
        payments: { upcoming: [], history: [] },
        workOrders,
        notifications,
        summary: null,
      };
    }

    const now = new Date();
    const upcoming = lease.payments
      .filter((p) => !p.paidAt && new Date(p.dueDate) >= now)
      .slice(0, 3);
    const overdue = lease.payments.filter(
      (p) => !p.paidAt && new Date(p.dueDate) < now,
    );
    const paidPayments = lease.payments.filter((p) => p.paidAt);
    const totalPaid = paidPayments.reduce((s, p) => s + p.amountCents, 0);
    const totalDue = lease.payments.reduce((s, p) => s + p.amountCents, 0);

    return {
      lease: {
        id: lease.id,
        status: lease.status,
        startDate: lease.startDate,
        endDate: lease.endDate,
        rentAmountCents: lease.rentAmountCents,
        depositCents: lease.depositCents,
        property: {
          name: lease.unit.property.name,
          address: lease.unit.property.address,
        },
        unit: {
          unitNumber: lease.unit.unitNumber,
        },
      },
      payments: {
        upcoming,
        overdue,
        history: paidPayments.slice(-10).reverse(),
      },
      workOrders,
      notifications,
      summary: {
        totalPaid,
        totalDue,
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((s, p) => s + p.amountCents, 0),
        nextPaymentDate: upcoming[0]?.dueDate || null,
        nextPaymentAmount: upcoming[0]?.amountCents || 0,
        daysUntilLeaseEnd: Math.ceil(
          (lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
        openWorkOrders: workOrders.filter(
          (j) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED',
        ).length,
      },
    };
  }

  async getMyLease(userId: string, organizationId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: userId, organizationId, status: 'ACTIVE' },
      include: {
        unit: { include: { property: true } },
        payments: { orderBy: { dueDate: 'asc' } },
        documents: true,
      },
    });
    if (!lease) throw new NotFoundException('No active lease found');
    return lease;
  }

  async getMyPayments(userId: string, organizationId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: userId, organizationId, status: 'ACTIVE' },
    });
    if (!lease) throw new NotFoundException('No active lease found');

    return this.prisma.payment.findMany({
      where: { leaseId: lease.id },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getMyWorkOrders(userId: string, organizationId: string) {
    return this.prisma.maintenanceJob.findMany({
      where: { createdById: userId, organizationId },
      include: {
        property: true,
        unit: true,
        assignedTo: { select: { name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitWorkOrder(
    userId: string,
    organizationId: string,
    dto: { title: string; description: string; priority?: string; category?: string },
  ) {
    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: userId, organizationId, status: 'ACTIVE' },
      include: { unit: { include: { property: true } } },
    });
    if (!lease)
      throw new NotFoundException('No active lease — cannot submit request');

    return this.prisma.maintenanceJob.create({
      data: {
        organizationId,
        propertyId: lease.unit.property.id,
        unitId: lease.unit.id,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        priority: (dto.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
        category: dto.category || 'GENERAL',
      },
      include: { property: true, unit: true },
    });
  }

  async addWorkOrderMessage(
    userId: string,
    organizationId: string,
    jobId: string,
    body: string,
  ) {
    const job = await this.prisma.maintenanceJob.findFirst({
      where: { id: jobId, organizationId, createdById: userId },
    });
    if (!job) throw new NotFoundException('Work order not found');

    return this.prisma.message.create({
      data: { jobId, senderId: userId, body },
      include: { sender: { select: { name: true, role: true } } },
    });
  }

  async getWorkOrderDetail(
    userId: string,
    organizationId: string,
    jobId: string,
  ) {
    const job = await this.prisma.maintenanceJob.findFirst({
      where: { id: jobId, organizationId, createdById: userId },
      include: {
        property: true,
        unit: true,
        assignedTo: { select: { name: true } },
        messages: {
          include: { sender: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!job) throw new NotFoundException('Work order not found');
    return job;
  }
}
