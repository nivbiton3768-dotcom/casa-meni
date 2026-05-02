import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        type: dto.type,
        category: dto.category,
        description: dto.description,
        amountCents: dto.amountCents,
        date: new Date(dto.date),
      },
    });
  }

  async findAll(organizationId: string, propertyId?: string) {
    return this.prisma.transaction.findMany({
      where: {
        organizationId,
        ...(propertyId ? { propertyId } : {}),
      },
      include: { property: true },
      orderBy: { date: 'desc' },
    });
  }

  async getPnl(organizationId: string, propertyId?: string) {
    const where = {
      organizationId,
      ...(propertyId ? { propertyId } : {}),
    };

    const [income, expenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amountCents: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amountCents: true },
      }),
    ]);

    const totalIncome = income._sum.amountCents || 0;
    const totalExpenses = expenses._sum.amountCents || 0;

    return {
      totalIncomeCents: totalIncome,
      totalExpensesCents: totalExpenses,
      netIncomeCents: totalIncome - totalExpenses,
    };
  }
}
