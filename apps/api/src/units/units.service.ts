import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateUnitDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId },
    });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.unit.create({
      data: {
        propertyId: dto.propertyId,
        unitNumber: dto.unitNumber,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        sqft: dto.sqft,
        rentAmountCents: dto.rentAmountCents,
      },
    });
  }

  async findByProperty(organizationId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId },
    });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.unit.findMany({
      where: { propertyId },
      include: {
        leases: { where: { status: 'ACTIVE' }, include: { tenant: true } },
      },
      orderBy: { unitNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        property: true,
        leases: { orderBy: { startDate: 'desc' } },
        maintenanceJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.findOne(id);
    return this.prisma.unit.update({
      where: { id },
      data: {
        unitNumber: dto.unitNumber,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        sqft: dto.sqft,
        rentAmountCents: dto.rentAmountCents,
      },
    });
  }
}
