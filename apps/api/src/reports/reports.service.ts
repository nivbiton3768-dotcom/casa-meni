import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyPnl(organizationId: string, months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const transactions = await this.prisma.transaction.findMany({
      where: { organizationId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    const monthMap = new Map<string, { income: number; expenses: number }>();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { income: 0, expenses: 0 });
    }

    for (const tx of transactions) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthMap.get(key);
      if (bucket) {
        if (tx.type === 'INCOME') bucket.income += tx.amountCents;
        else bucket.expenses += tx.amountCents;
      }
    }

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      incomeCents: data.income,
      expensesCents: data.expenses,
      netCents: data.income - data.expenses,
    }));
  }

  async getOccupancyRates(organizationId: string) {
    const properties = await this.prisma.property.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: {
        units: { select: { id: true, status: true } },
      },
    });

    const overall = { total: 0, occupied: 0 };
    const byProperty = properties.map((p) => {
      const total = p.units.length;
      const occupied = p.units.filter((u) => u.status === 'OCCUPIED').length;
      overall.total += total;
      overall.occupied += occupied;
      return {
        propertyId: p.id,
        propertyName: p.name,
        type: p.type,
        totalUnits: total,
        occupiedUnits: occupied,
        vacantUnits: total - occupied,
        occupancyPct: total > 0 ? Math.round((occupied / total) * 100) : 0,
      };
    });

    return {
      overall: {
        totalUnits: overall.total,
        occupiedUnits: overall.occupied,
        occupancyPct:
          overall.total > 0
            ? Math.round((overall.occupied / overall.total) * 100)
            : 0,
      },
      byProperty,
    };
  }

  async getRentCollection(organizationId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await this.prisma.payment.findMany({
      where: {
        lease: { organizationId },
        dueDate: { gte: sixMonthsAgo, lte: now },
      },
      orderBy: { dueDate: 'asc' },
    });

    const monthMap = new Map<
      string,
      { due: number; collected: number; dueCents: number; collectedCents: number }
    >();

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { due: 0, collected: 0, dueCents: 0, collectedCents: 0 });
    }

    for (const p of payments) {
      const key = `${p.dueDate.getFullYear()}-${String(p.dueDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.due += 1;
        bucket.dueCents += p.amountCents;
        if (p.paidAt) {
          bucket.collected += 1;
          bucket.collectedCents += p.amountCents;
        }
      }
    }

    const totalDue = payments.length;
    const totalCollected = payments.filter((p) => p.paidAt).length;
    const totalOverdue = payments.filter(
      (p) => !p.paidAt && p.dueDate < now,
    ).length;

    return {
      overall: {
        totalDue,
        totalCollected,
        totalOverdue,
        collectionPct: totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0,
      },
      monthly: Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        due: data.due,
        collected: data.collected,
        dueCents: data.dueCents,
        collectedCents: data.collectedCents,
        collectionPct: data.due > 0 ? Math.round((data.collected / data.due) * 100) : 0,
      })),
    };
  }

  async getRenovationBurn(organizationId: string) {
    const renovations = await this.prisma.renovation.findMany({
      where: { property: { organizationId } },
      include: {
        property: { select: { name: true } },
        expenses: { orderBy: { date: 'asc' } },
      },
    });

    return renovations.map((r) => {
      const monthlySpend = new Map<string, number>();
      for (const e of r.expenses) {
        const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
        monthlySpend.set(key, (monthlySpend.get(key) || 0) + e.amountCents);
      }

      let runningTotal = 0;
      const burnData = Array.from(monthlySpend.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, cents]) => {
          runningTotal += cents;
          return { month, spentCents: cents, cumulativeCents: runningTotal };
        });

      return {
        id: r.id,
        name: r.name,
        propertyName: r.property.name,
        status: r.status,
        budgetCents: r.budgetCents,
        actualCostCents: r.actualCostCents,
        budgetUsedPct:
          r.budgetCents > 0
            ? Math.round((r.actualCostCents / r.budgetCents) * 100)
            : 0,
        burnData,
      };
    });
  }

  async getInvestorReturns(organizationId: string) {
    const investors = await this.prisma.investor.findMany({
      where: { organizationId },
      include: {
        entity: { include: { properties: true } },
        distributions: true,
      },
    });

    const [totalIncome, totalExpenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { organizationId, type: 'INCOME' },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { organizationId, type: 'EXPENSE' },
        _sum: { amountCents: true },
      }),
    ]);

    const netIncome =
      (totalIncome._sum.amountCents || 0) - (totalExpenses._sum.amountCents || 0);

    return investors.map((inv) => {
      const share = Math.round(netIncome * (Number(inv.ownershipPct) / 100));
      const distributed = inv.distributions.reduce(
        (s, d) => s + d.amountCents,
        0,
      );

      return {
        id: inv.id,
        name: inv.name,
        ownershipPct: Number(inv.ownershipPct),
        profitShareCents: share,
        totalDistributedCents: distributed,
        undistributedCents: Math.max(0, share - distributed),
        propertyCount: inv.entity?.properties.length || 0,
      };
    });
  }
}
