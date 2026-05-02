import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: { organizationId, ...dto },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.vendor.findMany({
      where: { organizationId },
      include: {
        _count: { select: { renovationExpenses: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId },
      include: {
        renovationExpenses: {
          include: { renovation: { include: { property: true } } },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const totalSpent = vendor.renovationExpenses.reduce(
      (sum, e) => sum + e.amountCents,
      0,
    );

    return { ...vendor, totalSpentCents: totalSpent };
  }

  async update(organizationId: string, id: string, dto: Partial<CreateVendorDto>) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async delete(organizationId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    await this.prisma.vendor.delete({ where: { id } });
    return { deleted: true };
  }
}
