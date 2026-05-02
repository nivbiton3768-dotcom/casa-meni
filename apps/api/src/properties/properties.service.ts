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
        imageUrl: dto.imageUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        wifiName: dto.wifiName,
        wifiPassword: dto.wifiPassword,
        parkingInfo: dto.parkingInfo,
        utilityNotes: dto.utilityNotes,
        applianceNotes: dto.applianceNotes,
        emergencyContacts: dto.emergencyContacts,
        houseRules: dto.houseRules,
        localRecommendations: dto.localRecommendations,
      },
      include: { units: true, entity: true },
    });
  }

  async listMap(organizationId: string) {
    const properties = await this.prisma.property.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        type: true,
        latitude: true,
        longitude: true,
        imageUrl: true,
        units: {
          select: {
            id: true,
            status: true,
            rentAmountCents: true,
          },
        },
        _count: {
          select: {
            maintenanceJobs: { where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] } } },
          },
        },
      },
    });
    return properties.map((p) => {
      const total = p.units.length;
      const occupied = p.units.filter((u) => u.status === 'OCCUPIED').length;
      const totalRent = p.units.reduce((s, u) => s + u.rentAmountCents, 0);
      return {
        id: p.id,
        name: p.name,
        address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`,
        type: p.type,
        latitude: p.latitude ? Number(p.latitude) : null,
        longitude: p.longitude ? Number(p.longitude) : null,
        imageUrl: p.imageUrl,
        unitCount: total,
        occupancyPct: total > 0 ? Math.round((occupied / total) * 100) : 0,
        rentMonthlyCents: totalRent,
        openJobs: p._count.maintenanceJobs,
      };
    });
  }

  async compare(organizationId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const properties = await this.prisma.property.findMany({
      where: { id: { in: ids }, organizationId },
      include: {
        units: { include: { leases: { where: { status: 'ACTIVE' } } } },
      },
    });

    const result = await Promise.all(
      properties.map(async (p) => {
        const since = new Date();
        since.setMonth(since.getMonth() - 12);

        const [income, expenses, openJobs] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: {
              organizationId,
              propertyId: p.id,
              type: 'INCOME',
              date: { gte: since },
            },
            _sum: { amountCents: true },
          }),
          this.prisma.transaction.aggregate({
            where: {
              organizationId,
              propertyId: p.id,
              type: 'EXPENSE',
              date: { gte: since },
            },
            _sum: { amountCents: true },
          }),
          this.prisma.maintenanceJob.count({
            where: {
              organizationId,
              propertyId: p.id,
              status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] },
            },
          }),
        ]);

        const totalUnits = p.units.length;
        const occupied = p.units.filter((u) => u.status === 'OCCUPIED').length;
        const monthlyRent = p.units.reduce(
          (s, u) => s + u.rentAmountCents,
          0,
        );
        const annualIncome = income._sum.amountCents ?? 0;
        const annualExpenses = expenses._sum.amountCents ?? 0;
        const noi = annualIncome - annualExpenses;
        const capRate =
          p.purchasePrice && p.purchasePrice > 0
            ? Number(((noi / p.purchasePrice) * 100).toFixed(2))
            : null;
        const cashOnCash =
          p.currentValue && p.currentValue > 0
            ? Number(((noi / p.currentValue) * 100).toFixed(2))
            : null;

        return {
          id: p.id,
          name: p.name,
          address: `${p.address}, ${p.city}, ${p.state}`,
          type: p.type,
          totalUnits,
          occupied,
          occupancyPct:
            totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0,
          monthlyRentCents: monthlyRent,
          purchasePriceCents: p.purchasePrice ?? null,
          currentValueCents: p.currentValue ?? null,
          annualIncomeCents: annualIncome,
          annualExpensesCents: annualExpenses,
          noiCents: noi,
          capRatePct: capRate,
          cashOnCashPct: cashOnCash,
          openJobs,
        };
      }),
    );

    return result;
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
