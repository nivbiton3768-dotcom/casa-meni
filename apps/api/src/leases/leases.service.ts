import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.lease.findMany({
      where: { organizationId },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        payments: { orderBy: { dueDate: 'desc' }, take: 3 },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getTenants(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId, role: 'TENANT', isActive: true },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            unit: { include: { property: true } },
            payments: {
              where: { paidAt: null },
              orderBy: { dueDate: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      leases: u.leases.map((l) => ({
        id: l.id,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
        rentAmountCents: l.rentAmountCents,
        propertyName: l.unit.property.name,
        unitNumber: l.unit.unitNumber,
        nextPaymentDue: l.payments[0]?.dueDate || null,
      })),
    }));
  }
}
