import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        organizationId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        type: dto.type,
        entityId: dto.entityId,
        purchasePrice: dto.purchasePrice,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        currentValue: dto.currentValue,
        notes: dto.notes,
      },
      include: { units: true, entity: true },
    });
  }

  async findAll(organizationId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where: { organizationId },
        include: {
          units: true,
          _count: { select: { maintenanceJobs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.property.count({ where: { organizationId } }),
    ]);

    return { properties, total, page, pageSize };
  }

  async findOne(organizationId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId },
      include: {
        units: {
          include: {
            leases: {
              where: { status: 'ACTIVE' },
              include: { tenant: true },
            },
          },
          orderBy: { unitNumber: 'asc' },
        },
        entity: true,
        maintenanceJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
        transactions: { orderBy: { date: 'desc' }, take: 10 },
        documents: { orderBy: { createdAt: 'desc' } },
        renovations: {
          include: { expenses: { orderBy: { date: 'desc' } } },
        },
        listings: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async update(organizationId: string, id: string, dto: UpdatePropertyDto) {
    await this.findOne(organizationId, id);

    return this.prisma.property.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
      include: { units: true, entity: true },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.property.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async getDashboardStats(organizationId: string) {
    const [
      totalProperties,
      allUnits,
      occupiedUnits,
      activeLeases,
      openJobs,
      income,
      expenses,
      overduePayments,
      upcomingReservations,
    ] = await Promise.all([
      this.prisma.property.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.prisma.unit.count({
        where: { property: { organizationId } },
      }),
      this.prisma.unit.count({
        where: { property: { organizationId }, status: 'OCCUPIED' },
      }),
      this.prisma.lease.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.prisma.maintenanceJob.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] },
        },
      }),
      this.prisma.transaction.aggregate({
        where: { organizationId, type: 'INCOME' },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { organizationId, type: 'EXPENSE' },
        _sum: { amountCents: true },
      }),
      this.prisma.payment.count({
        where: {
          lease: { organizationId },
          paidAt: null,
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.reservation.count({
        where: {
          organizationId,
          status: 'CONFIRMED',
          checkIn: { gte: new Date() },
        },
      }),
    ]);

    const totalIncomeCents = income._sum.amountCents || 0;
    const totalExpensesCents = expenses._sum.amountCents || 0;
    const occupancyRate =
      allUnits > 0 ? Math.round((occupiedUnits / allUnits) * 100) : 0;

    return {
      totalProperties,
      totalUnits: allUnits,
      occupiedUnits,
      occupancyRate,
      activeTenants: activeLeases,
      openWorkOrders: openJobs,
      totalIncomeCents,
      totalExpensesCents,
      netIncomeCents: totalIncomeCents - totalExpensesCents,
      overduePayments,
      upcomingReservations,
    };
  }
}
