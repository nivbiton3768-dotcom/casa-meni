import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { CreateDistributionDto } from './dto/create-distribution.dto';

@Injectable()
export class InvestorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateInvestorDto) {
    if (dto.entityId) {
      const entity = await this.prisma.entity.findFirst({
        where: { id: dto.entityId, organizationId },
      });
      if (!entity) throw new NotFoundException('Entity not found');
    }

    return this.prisma.investor.create({
      data: {
        organizationId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        ownershipPct: dto.ownershipPct,
        entityId: dto.entityId || null,
      },
      include: { entity: true },
    });
  }

  async findAll(organizationId: string) {
    const investors = await this.prisma.investor.findMany({
      where: { organizationId },
      include: {
        entity: true,
        distributions: { orderBy: { date: 'desc' }, take: 1 },
        _count: { select: { distributions: true } },
      },
      orderBy: { name: 'asc' },
    });

    const totalDistributions = await this.prisma.distribution.groupBy({
      by: ['investorId'],
      where: { investor: { organizationId } },
      _sum: { amountCents: true },
    });

    const distMap = new Map(
      totalDistributions.map((d) => [d.investorId, d._sum.amountCents || 0]),
    );

    return investors.map((inv) => ({
      ...inv,
      totalDistributedCents: distMap.get(inv.id) || 0,
    }));
  }

  async findOne(organizationId: string, id: string) {
    const investor = await this.prisma.investor.findFirst({
      where: { id, organizationId },
      include: {
        entity: { include: { properties: true } },
        distributions: { orderBy: { date: 'desc' } },
      },
    });
    if (!investor) throw new NotFoundException('Investor not found');

    const totalDistributed = investor.distributions.reduce(
      (sum, d) => sum + d.amountCents,
      0,
    );

    return { ...investor, totalDistributedCents: totalDistributed };
  }

  async createDistribution(organizationId: string, dto: CreateDistributionDto) {
    const investor = await this.prisma.investor.findFirst({
      where: { id: dto.investorId, organizationId },
    });
    if (!investor) throw new NotFoundException('Investor not found');

    return this.prisma.distribution.create({
      data: {
        investorId: dto.investorId,
        amountCents: dto.amountCents,
        date: new Date(dto.date),
        notes: dto.notes,
      },
      include: { investor: true },
    });
  }

  async getPortfolioSummary(organizationId: string) {
    const [investors, entities, distributions, pnl] = await Promise.all([
      this.prisma.investor.findMany({ where: { organizationId } }),
      this.prisma.entity.findMany({
        where: { organizationId },
        include: { properties: true, _count: { select: { investors: true } } },
      }),
      this.prisma.distribution.aggregate({
        where: { investor: { organizationId } },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.getOrgPnl(organizationId),
    ]);

    const totalOwnership = investors.reduce(
      (sum, i) => sum + Number(i.ownershipPct),
      0,
    );

    return {
      investorCount: investors.length,
      entityCount: entities.length,
      totalOwnershipPct: totalOwnership,
      totalDistributedCents: distributions._sum.amountCents || 0,
      distributionCount: distributions._count,
      pnl,
      entities: entities.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        propertyCount: e.properties.length,
        investorCount: e._count.investors,
        totalValueCents: e.properties.reduce(
          (s, p) => s + (p.currentValue || 0),
          0,
        ),
      })),
    };
  }

  async getInvestorMetrics(organizationId: string, investorId: string) {
    const investor = await this.prisma.investor.findFirst({
      where: { id: investorId, organizationId },
      include: {
        entity: { include: { properties: true } },
        distributions: { orderBy: { date: 'asc' } },
      },
    });
    if (!investor) throw new NotFoundException('Investor not found');

    const propertyIds = investor.entity?.properties.map((p) => p.id) || [];
    const ownershipFraction = Number(investor.ownershipPct) / 100;

    const totalPropertyValue = investor.entity?.properties.reduce(
      (s, p) => s + (p.currentValue || 0), 0,
    ) || 0;
    const totalPurchasePrice = investor.entity?.properties.reduce(
      (s, p) => s + (p.purchasePrice || 0), 0,
    ) || 0;

    const investorEquity = Math.round(totalPurchasePrice * ownershipFraction);
    const currentEquityValue = Math.round(totalPropertyValue * ownershipFraction);

    const totalDistributed = investor.distributions.reduce(
      (s, d) => s + d.amountCents, 0,
    );

    let annualNetIncome = 0;
    if (propertyIds.length > 0) {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const [income12m, expenses12m] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { organizationId, propertyId: { in: propertyIds }, type: 'INCOME', date: { gte: oneYearAgo } },
          _sum: { amountCents: true },
        }),
        this.prisma.transaction.aggregate({
          where: { organizationId, propertyId: { in: propertyIds }, type: 'EXPENSE', date: { gte: oneYearAgo } },
          _sum: { amountCents: true },
        }),
      ]);
      annualNetIncome = (income12m._sum.amountCents || 0) - (expenses12m._sum.amountCents || 0);
    }

    const investorAnnualShare = Math.round(annualNetIncome * ownershipFraction);

    // Cash-on-Cash Return = Annual Cash Flow / Total Cash Invested
    const cashOnCash = investorEquity > 0
      ? ((investorAnnualShare / investorEquity) * 100)
      : 0;

    // Equity Multiple = (Total Distributions + Current Equity) / Cash Invested
    const equityMultiple = investorEquity > 0
      ? ((totalDistributed + currentEquityValue) / investorEquity)
      : 0;

    // Simplified IRR approximation based on holding period
    const firstPurchase = investor.entity?.properties
      .filter((p) => p.purchaseDate)
      .sort((a, b) => new Date(a.purchaseDate!).getTime() - new Date(b.purchaseDate!).getTime())[0];
    const holdingYears = firstPurchase?.purchaseDate
      ? (Date.now() - new Date(firstPurchase.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      : 1;
    const totalReturn = totalDistributed + currentEquityValue - investorEquity;
    const irr = investorEquity > 0 && holdingYears > 0
      ? ((Math.pow((totalDistributed + currentEquityValue) / investorEquity, 1 / holdingYears) - 1) * 100)
      : 0;

    return {
      investorName: investor.name,
      ownershipPct: Number(investor.ownershipPct),
      investedCents: investorEquity,
      currentValueCents: currentEquityValue,
      totalDistributedCents: totalDistributed,
      annualCashFlowCents: investorAnnualShare,
      totalReturnCents: totalReturn,
      cashOnCashPct: Math.round(cashOnCash * 100) / 100,
      equityMultiple: Math.round(equityMultiple * 100) / 100,
      irrPct: Math.round(irr * 100) / 100,
      holdingYears: Math.round(holdingYears * 10) / 10,
      propertyCount: propertyIds.length,
    };
  }

  async getInvestorPnl(organizationId: string, investorId: string) {
    const investor = await this.prisma.investor.findFirst({
      where: { id: investorId, organizationId },
      include: { entity: { include: { properties: true } } },
    });
    if (!investor) throw new NotFoundException('Investor not found');

    const propertyIds = investor.entity
      ? investor.entity.properties.map((p) => p.id)
      : [];

    if (propertyIds.length === 0) {
      return {
        investorName: investor.name,
        ownershipPct: Number(investor.ownershipPct),
        properties: [],
        totalIncomeCents: 0,
        totalExpensesCents: 0,
        netIncomeCents: 0,
        investorShareCents: 0,
        totalDistributedCents: 0,
      };
    }

    const propertyPnls = await Promise.all(
      propertyIds.map(async (propId) => {
        const [income, expenses, property] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: { organizationId, propertyId: propId, type: 'INCOME' },
            _sum: { amountCents: true },
          }),
          this.prisma.transaction.aggregate({
            where: { organizationId, propertyId: propId, type: 'EXPENSE' },
            _sum: { amountCents: true },
          }),
          this.prisma.property.findUnique({ where: { id: propId } }),
        ]);

        const inc = income._sum.amountCents || 0;
        const exp = expenses._sum.amountCents || 0;

        return {
          propertyId: propId,
          propertyName: property?.name || 'Unknown',
          incomeCents: inc,
          expensesCents: exp,
          netCents: inc - exp,
        };
      }),
    );

    const totalIncome = propertyPnls.reduce((s, p) => s + p.incomeCents, 0);
    const totalExpenses = propertyPnls.reduce((s, p) => s + p.expensesCents, 0);
    const net = totalIncome - totalExpenses;
    const share = Math.round(net * (Number(investor.ownershipPct) / 100));

    const totalDist = await this.prisma.distribution.aggregate({
      where: { investorId },
      _sum: { amountCents: true },
    });

    return {
      investorName: investor.name,
      ownershipPct: Number(investor.ownershipPct),
      properties: propertyPnls,
      totalIncomeCents: totalIncome,
      totalExpensesCents: totalExpenses,
      netIncomeCents: net,
      investorShareCents: share,
      totalDistributedCents: totalDist._sum.amountCents || 0,
    };
  }

  private async getOrgPnl(organizationId: string) {
    const [income, expenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { organizationId, type: 'INCOME' },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { organizationId, type: 'EXPENSE' },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      totalIncomeCents: income._sum.amountCents || 0,
      totalExpensesCents: expenses._sum.amountCents || 0,
      netIncomeCents:
        (income._sum.amountCents || 0) - (expenses._sum.amountCents || 0),
    };
  }
}
