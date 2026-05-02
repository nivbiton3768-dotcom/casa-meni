import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const toCsv = (rows: Array<Record<string, unknown>>, columns: string[]): string => {
  const header = columns.map(escape).join(',');
  const body = rows
    .map((r) => columns.map((c) => escape(r[c])).join(','))
    .join('\n');
  return `${header}\n${body}`;
};

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async transactionsCsv(
    organizationId: string,
    filters: { from?: Date; to?: Date; propertyId?: string },
  ): Promise<string> {
    const txns = await this.prisma.transaction.findMany({
      where: {
        organizationId,
        ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
        ...(filters.from || filters.to
          ? {
              date: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: {
        property: { select: { name: true, address: true } },
      },
      orderBy: { date: 'asc' },
    });

    const rows = txns.map((t) => ({
      date: t.date.toISOString().slice(0, 10),
      type: t.type,
      category: t.category,
      property: t.property?.name ?? '',
      address: t.property?.address ?? '',
      description: t.description,
      amount: (t.amountCents / 100).toFixed(2),
      receiptUrl: t.receiptUrl ?? '',
    }));
    return toCsv(rows, [
      'date',
      'type',
      'category',
      'property',
      'address',
      'description',
      'amount',
      'receiptUrl',
    ]);
  }

  async rentRollCsv(organizationId: string): Promise<string> {
    const leases = await this.prisma.lease.findMany({
      where: { organizationId, status: { in: ['ACTIVE', 'DRAFT'] } },
      include: {
        tenant: { select: { name: true, email: true, phone: true } },
        unit: {
          include: {
            property: { select: { name: true, address: true, city: true, state: true } },
          },
        },
        payments: {
          where: { paidAt: null, status: { in: ['PENDING', 'FAILED'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    const rows = leases.map((l) => ({
      property: l.unit.property.name,
      address: `${l.unit.property.address}, ${l.unit.property.city}, ${l.unit.property.state}`,
      unit: l.unit.unitNumber,
      tenant: l.tenant.name,
      tenantEmail: l.tenant.email,
      tenantPhone: l.tenant.phone ?? '',
      status: l.status,
      rentMonthly: (l.rentAmountCents / 100).toFixed(2),
      depositHeld: (l.depositCents / 100).toFixed(2),
      leaseStart: l.startDate.toISOString().slice(0, 10),
      leaseEnd: l.endDate.toISOString().slice(0, 10),
      autopay: l.autopayEnabled ? 'yes' : 'no',
      nextDueDate:
        l.payments[0]?.dueDate.toISOString().slice(0, 10) ?? '',
      nextDueAmount: l.payments[0]
        ? (l.payments[0].amountCents / 100).toFixed(2)
        : '',
    }));

    return toCsv(rows, [
      'property',
      'address',
      'unit',
      'tenant',
      'tenantEmail',
      'tenantPhone',
      'status',
      'rentMonthly',
      'depositHeld',
      'leaseStart',
      'leaseEnd',
      'autopay',
      'nextDueDate',
      'nextDueAmount',
    ]);
  }

  async reservationsCsv(
    organizationId: string,
    filters: { from?: Date; to?: Date },
  ): Promise<string> {
    const list = await this.prisma.reservation.findMany({
      where: {
        organizationId,
        ...(filters.from || filters.to
          ? {
              checkIn: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: {
        property: { select: { name: true } },
        unit: { select: { unitNumber: true } },
      },
      orderBy: { checkIn: 'asc' },
    });

    const rows = list.map((r) => ({
      property: r.property.name,
      unit: r.unit?.unitNumber ?? '',
      channel: r.channel ?? '',
      status: r.status,
      guest: r.guestName,
      email: r.guestEmail,
      phone: r.guestPhone ?? '',
      checkIn: r.checkIn.toISOString().slice(0, 10),
      checkOut: r.checkOut.toISOString().slice(0, 10),
      nights: Math.round(
        (r.checkOut.getTime() - r.checkIn.getTime()) / 86_400_000,
      ),
      total: (r.totalCents / 100).toFixed(2),
      cleaningFee: (r.cleaningFeeCents / 100).toFixed(2),
    }));

    return toCsv(rows, [
      'property',
      'unit',
      'channel',
      'status',
      'guest',
      'email',
      'phone',
      'checkIn',
      'checkOut',
      'nights',
      'total',
      'cleaningFee',
    ]);
  }
}
