import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class LeasesService {
  private readonly logger = new Logger(LeasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    const url =
      this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() ||
      'http://localhost:3000';
    return url.replace(/\/$/, '');
  }

  async create(organizationId: string, dto: CreateLeaseDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
      include: { property: true },
    });

    if (!unit || unit.property.organizationId !== organizationId) {
      throw new NotFoundException('Unit not found');
    }

    let tenantId = dto.tenantId;
    let newTenantWelcomeData: {
      email: string;
      tempPassword: string;
    } | null = null;

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
        const tempPassword = randomBytes(6).toString('base64url');
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const newTenant = await this.prisma.user.create({
          data: {
            organizationId,
            email: dto.tenantEmail.toLowerCase(),
            passwordHash,
            name: dto.tenantName,
            role: 'TENANT',
          },
        });
        tenantId = newTenant.id;
        newTenantWelcomeData = { email: newTenant.email, tempPassword };
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

    if (newTenantWelcomeData) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });
      const portalUrl = `${this.getFrontendUrl()}/login`;
      this.email
        .sendTenantWelcome(newTenantWelcomeData.email, {
          tenantName: lease.tenant.name,
          organizationName: org?.name ?? 'Casa Meni',
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          email: newTenantWelcomeData.email,
          tempPassword: newTenantWelcomeData.tempPassword,
          portalUrl,
        })
        .catch((err) =>
          this.logger.error(`Failed to send tenant welcome email: ${err}`),
        );
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

  /**
   * Terminate an active lease early: mark it TERMINATED, free the unit, and
   * remove future unpaid payments (past-due unpaid payments are kept on the
   * ledger for record-keeping).
   */
  async endLease(organizationId: string, id: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, organizationId },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.status === 'TERMINATED') {
      throw new BadRequestException('Lease is already terminated');
    }

    const now = new Date();
    const [updated, voided] = await this.prisma.$transaction([
      this.prisma.lease.update({
        where: { id },
        data: { status: 'TERMINATED', endDate: now },
      }),
      this.prisma.payment.deleteMany({
        where: { leaseId: id, paidAt: null, dueDate: { gt: now } },
      }),
      this.prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: 'VACANT' },
      }),
    ]);

    return { ...updated, futurePaymentsVoided: voided.count };
  }

  /**
   * Update a tenant's profile (name/email/phone). The user must be a TENANT in
   * this org. Email must stay unique within the org.
   */
  async updateTenant(
    organizationId: string,
    tenantId: string,
    dto: { name?: string; email?: string; phone?: string },
  ) {
    const tenant = await this.prisma.user.findFirst({
      where: { id: tenantId, organizationId, role: 'TENANT' },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (dto.email && dto.email.toLowerCase() !== tenant.email) {
      const clash = await this.prisma.user.findFirst({
        where: {
          organizationId,
          email: dto.email.toLowerCase(),
          id: { not: tenantId },
        },
      });
      if (clash) {
        throw new BadRequestException(
          'Another user already uses that email address',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined
          ? { email: dto.email.toLowerCase() }
          : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      },
      select: { id: true, name: true, email: true, phone: true },
    });
    return updated;
  }

  /**
   * Move an active lease to a different vacant unit (same org). The tenant,
   * payment history, dates and rent are preserved unless a new rent is given.
   */
  async transferLease(
    organizationId: string,
    leaseId: string,
    dto: { newUnitId: string; rentAmountCents?: number },
  ) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, organizationId },
      include: { unit: true },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.status !== 'ACTIVE') {
      throw new BadRequestException('Only active leases can be transferred');
    }
    if (lease.unitId === dto.newUnitId) {
      throw new BadRequestException('Lease is already on that unit');
    }

    const newUnit = await this.prisma.unit.findFirst({
      where: { id: dto.newUnitId, property: { organizationId } },
    });
    if (!newUnit) throw new NotFoundException('Target unit not found');
    if (newUnit.status === 'OCCUPIED') {
      throw new BadRequestException('Target unit is already occupied');
    }

    const oldUnitId = lease.unitId;
    const [updated] = await this.prisma.$transaction([
      this.prisma.lease.update({
        where: { id: leaseId },
        data: {
          unitId: dto.newUnitId,
          ...(dto.rentAmountCents
            ? { rentAmountCents: dto.rentAmountCents }
            : {}),
        },
        include: { tenant: true, unit: { include: { property: true } } },
      }),
      this.prisma.unit.update({
        where: { id: dto.newUnitId },
        data: { status: 'OCCUPIED' },
      }),
      this.prisma.unit.update({
        where: { id: oldUnitId },
        data: { status: 'VACANT' },
      }),
      ...(dto.rentAmountCents
        ? [
            this.prisma.payment.updateMany({
              where: { leaseId, paidAt: null, dueDate: { gt: new Date() } },
              data: { amountCents: dto.rentAmountCents },
            }),
          ]
        : []),
    ]);

    return updated;
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
