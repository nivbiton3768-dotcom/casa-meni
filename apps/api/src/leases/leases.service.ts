import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateLeaseDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
      include: { property: true },
    });

    if (!unit || unit.property.organizationId !== organizationId) {
      throw new NotFoundException('Unit not found');
    }

    let tenantId = dto.tenantId;

    if (!tenantId) {
      if (!dto.tenantName || !dto.tenantEmail) {
        throw new BadRequestException(
          'Provide either tenantId or tenantName + tenantEmail',
        );
      }

      const existing = await this.prisma.user.findFirst({
        where: {
          organizationId,
          email: dto.tenantEmail.toLowerCase(),
        },
      });

      if (existing) {
        tenantId = existing.id;
      } else {
        const tempPassword = await bcrypt.hash('changeme123', 12);
        const newTenant = await this.prisma.user.create({
          data: {
            organizationId,
            email: dto.tenantEmail.toLowerCase(),
            passwordHash: tempPassword,
            name: dto.tenantName,
            role: 'TENANT',
          },
        });
        tenantId = newTenant.id;
      }
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const lease = await this.prisma.lease.create({
      data: {
        organizationId,
        unitId: dto.unitId,
        tenantId,
        status: 'ACTIVE',
        startDate,
        endDate,
        rentAmountCents: dto.rentAmountCents,
        depositCents: dto.depositCents,
        lateFeesCents: dto.lateFeesCents || 0,
      },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    await this.prisma.unit.update({
      where: { id: dto.unitId },
      data: { status: 'OCCUPIED' },
    });

    const payments: { leaseId: string; amountCents: number; dueDate: Date }[] =
      [];
    const current = new Date(startDate);
    while (current < endDate) {
      payments.push({
        leaseId: lease.id,
        amountCents: dto.rentAmountCents,
        dueDate: new Date(current),
      });
      current.setMonth(current.getMonth() + 1);
    }

    if (payments.length > 0) {
      await this.prisma.payment.createMany({ data: payments });
    }

    return {
      ...lease,
      paymentsGenerated: payments.length,
    };
  }

  async findAll(organizationId: string) {
    return this.prisma.lease.findMany({
      where: { organizationId },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        _count: { select: { payments: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, organizationId },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        payments: { orderBy: { dueDate: 'asc' } },
        documents: true,
      },
    });

    if (!lease) throw new NotFoundException('Lease not found');
    return lease;
  }

  async recordPayment(organizationId: string, paymentId: string, method: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { lease: true },
    });

    if (!payment || payment.lease.organizationId !== organizationId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.paidAt) {
      throw new BadRequestException('Payment already recorded');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { paidAt: new Date(), method },
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

  async getVacantUnits(organizationId: string) {
    return this.prisma.unit.findMany({
      where: {
        property: { organizationId },
        status: 'VACANT',
      },
      include: { property: true },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
    });
  }
}
