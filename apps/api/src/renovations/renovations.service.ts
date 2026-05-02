import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRenovationDto } from './dto/create-renovation.dto';
import { AddExpenseDto } from './dto/add-expense.dto';
import { RenovationStatus } from '@prisma/client';

@Injectable()
export class RenovationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateRenovationDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId },
    });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.renovation.create({
      data: {
        propertyId: dto.propertyId,
        name: dto.name,
        budgetCents: dto.budgetCents,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
      },
      include: { property: true, expenses: true },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.renovation.findMany({
      where: { property: { organizationId } },
      include: {
        property: true,
        expenses: { orderBy: { date: 'desc' }, take: 5 },
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const renovation = await this.prisma.renovation.findFirst({
      where: { id, property: { organizationId } },
      include: {
        property: true,
        expenses: {
          include: { vendor: true },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!renovation) throw new NotFoundException('Renovation not found');

    const byCategory = renovation.expenses.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amountCents;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...renovation,
      breakdown: byCategory,
      budgetRemaining: renovation.budgetCents - renovation.actualCostCents,
      budgetUsedPct:
        renovation.budgetCents > 0
          ? Math.round(
              (renovation.actualCostCents / renovation.budgetCents) * 100,
            )
          : 0,
    };
  }

  async addExpense(organizationId: string, renovationId: string, dto: AddExpenseDto) {
    const renovation = await this.prisma.renovation.findFirst({
      where: { id: renovationId, property: { organizationId } },
    });
    if (!renovation) throw new NotFoundException('Renovation not found');

    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId },
      });
      if (!vendor) throw new NotFoundException('Vendor not found');
    }

    const [expense] = await this.prisma.$transaction([
      this.prisma.renovationExpense.create({
        data: {
          renovationId,
          category: dto.category,
          description: dto.description,
          amountCents: dto.amountCents,
          date: new Date(dto.date),
          vendorId: dto.vendorId || null,
          receiptUrl: dto.receiptUrl || null,
        },
        include: { vendor: true },
      }),
      this.prisma.renovation.update({
        where: { id: renovationId },
        data: { actualCostCents: { increment: dto.amountCents } },
      }),
    ]);

    return expense;
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: RenovationStatus,
  ) {
    const renovation = await this.prisma.renovation.findFirst({
      where: { id, property: { organizationId } },
    });
    if (!renovation) throw new NotFoundException('Renovation not found');

    return this.prisma.renovation.update({
      where: { id },
      data: { status },
      include: { property: true },
    });
  }

  async deleteExpense(organizationId: string, expenseId: string) {
    const expense = await this.prisma.renovationExpense.findFirst({
      where: { id: expenseId, renovation: { property: { organizationId } } },
      include: { renovation: true },
    });
    if (!expense) throw new NotFoundException('Expense not found');

    await this.prisma.$transaction([
      this.prisma.renovationExpense.delete({ where: { id: expenseId } }),
      this.prisma.renovation.update({
        where: { id: expense.renovationId },
        data: { actualCostCents: { decrement: expense.amountCents } },
      }),
    ]);

    return { deleted: true };
  }
}
