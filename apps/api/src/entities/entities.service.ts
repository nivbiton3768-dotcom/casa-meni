import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateEntityDto) {
    return this.prisma.entity.create({
      data: { organizationId, ...dto },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.entity.findMany({
      where: { organizationId },
      include: {
        properties: true,
        investors: true,
        _count: { select: { properties: true, investors: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id, organizationId },
      include: {
        properties: {
          include: {
            _count: { select: { units: true, renovations: true } },
          },
        },
        investors: {
          include: {
            _count: { select: { distributions: true } },
          },
        },
      },
    });
    if (!entity) throw new NotFoundException('Entity not found');

    const totalOwnership = entity.investors.reduce(
      (sum, i) => sum + Number(i.ownershipPct),
      0,
    );
    const totalValue = entity.properties.reduce(
      (sum, p) => sum + (p.currentValue || 0),
      0,
    );

    return {
      ...entity,
      totalOwnershipPct: totalOwnership,
      totalPortfolioValueCents: totalValue,
    };
  }

  async update(organizationId: string, id: string, dto: Partial<CreateEntityDto>) {
    const entity = await this.prisma.entity.findFirst({
      where: { id, organizationId },
    });
    if (!entity) throw new NotFoundException('Entity not found');

    return this.prisma.entity.update({ where: { id }, data: dto });
  }
}
