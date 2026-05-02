import {
  Controller,
  Get,
  Injectable,
  Module,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class CostAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cost-per-sqft analysis (FR61): renovations + maintenance / total sqft. */
  async costPerSqft(organizationId: string) {
    const properties = await this.prisma.property.findMany({
      where: { organizationId },
      include: {
        units: { select: { sqft: true } },
        renovations: {
          include: { expenses: { select: { amountCents: true, category: true } } },
        },
        maintenanceJobs: { select: { actualCostCents: true, category: true } },
        transactions: { select: { amountCents: true, category: true, type: true } },
      },
    });

    return properties.map((p) => {
      const totalSqft = p.units.reduce((s, u) => s + (u.sqft ?? 0), 0);
      const renoTotal = p.renovations.reduce(
        (s, r) => s + r.expenses.reduce((s2, e) => s2 + e.amountCents, 0),
        0,
      );
      const maintTotal = p.maintenanceJobs.reduce(
        (s, j) => s + (j.actualCostCents ?? 0),
        0,
      );
      const expenseTotal = p.transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((s, t) => s + t.amountCents, 0);
      const total = renoTotal + maintTotal + expenseTotal;
      return {
        propertyId: p.id,
        name: p.name,
        sqft: totalSqft,
        totalSpentCents: total,
        renoCents: renoTotal,
        maintCents: maintTotal,
        opexCents: expenseTotal,
        costPerSqftCents: totalSqft > 0 ? Math.round(total / totalSqft) : 0,
      };
    });
  }

  /** ROI per renovation category (FR62). */
  async roiByCategory(organizationId: string) {
    // Group renovation expenses by category, then look at properties whose value increased.
    const expenses = await this.prisma.renovationExpense.groupBy({
      by: ['category'],
      where: {
        renovation: { property: { organizationId } },
      },
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    const properties = await this.prisma.property.findMany({
      where: { organizationId },
      select: { purchasePrice: true, currentValue: true },
    });
    const totalDelta = properties.reduce(
      (s, p) => s + Math.max(0, (p.currentValue ?? 0) - (p.purchasePrice ?? 0)),
      0,
    );
    const totalSpent = expenses.reduce((s, e) => s + (e._sum.amountCents ?? 0), 0);

    return {
      summary: {
        totalRenoSpentCents: totalSpent,
        totalEquityGainCents: totalDelta,
        overallROIBps:
          totalSpent > 0 ? Math.round((totalDelta / totalSpent) * 10000) : null,
      },
      byCategory: expenses
        .map((e) => ({
          category: e.category,
          spentCents: e._sum.amountCents ?? 0,
          itemCount: e._count._all,
          shareBps:
            totalSpent > 0 ? Math.round(((e._sum.amountCents ?? 0) / totalSpent) * 10000) : 0,
        }))
        .sort((a, b) => b.spentCents - a.spentCents),
    };
  }

  /** Compare renovation cost vs expected market lift by neighborhood. */
  async neighborhoodCosts(organizationId: string) {
    const properties = await this.prisma.property.findMany({
      where: { organizationId },
      select: { id: true, city: true, state: true, purchasePrice: true, currentValue: true, units: { select: { sqft: true } } },
    });
    const grouped = new Map<string, { count: number; totalSqft: number; totalDelta: number; totalCost: number }>();
    for (const p of properties) {
      const key = `${p.city}, ${p.state}`;
      const sqft = p.units.reduce((s, u) => s + (u.sqft ?? 0), 0);
      const delta = (p.currentValue ?? 0) - (p.purchasePrice ?? 0);
      const cost = p.purchasePrice ?? 0;
      const cur = grouped.get(key) ?? { count: 0, totalSqft: 0, totalDelta: 0, totalCost: 0 };
      cur.count++;
      cur.totalSqft += sqft;
      cur.totalDelta += delta;
      cur.totalCost += cost;
      grouped.set(key, cur);
    }
    return Array.from(grouped.entries()).map(([area, v]) => ({
      area,
      ...v,
      avgPricePerSqftCents: v.totalSqft > 0 ? Math.round(v.totalCost / v.totalSqft) : 0,
      avgEquityGainCents: v.count > 0 ? Math.round(v.totalDelta / v.count) : 0,
    }));
  }
}

@Controller('cost-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT', 'PROPERTY_MANAGER', 'INVESTOR')
export class CostAnalyticsController {
  constructor(private readonly service: CostAnalyticsService) {}

  @Get('per-sqft')
  perSqft(@CurrentUser('organizationId') organizationId: string) {
    return this.service.costPerSqft(organizationId);
  }

  @Get('roi-by-category')
  roi(@CurrentUser('organizationId') organizationId: string) {
    return this.service.roiByCategory(organizationId);
  }

  @Get('neighborhoods')
  neigh(@CurrentUser('organizationId') organizationId: string) {
    return this.service.neighborhoodCosts(organizationId);
  }
}

@Module({
  controllers: [CostAnalyticsController],
  providers: [CostAnalyticsService],
})
export class CostAnalyticsModule {}
