import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.reservation.findMany({
      where: { organizationId },
      include: {
        property: true,
        unit: true,
        cleaningSchedules: { include: { assignee: true } },
      },
      orderBy: { checkIn: 'desc' },
    });
  }

  async getUpcoming(organizationId: string) {
    return this.prisma.reservation.findMany({
      where: {
        organizationId,
        checkIn: { gte: new Date() },
        status: { in: ['CONFIRMED', 'INQUIRY'] },
      },
      include: { property: true, unit: true },
      orderBy: { checkIn: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateReservationDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId },
    });
    if (!property) {
      throw new BadRequestException('Property not found in this organization');
    }

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, propertyId: dto.propertyId },
    });
    if (!unit) {
      throw new BadRequestException('Unit not found in this property');
    }

    const overlap = await this.prisma.reservation.findFirst({
      where: {
        unitId: dto.unitId,
        status: { not: 'CANCELLED' },
        checkIn: { lt: new Date(dto.checkOut) },
        checkOut: { gt: new Date(dto.checkIn) },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'This unit already has a reservation for the selected dates',
      );
    }

    return this.prisma.reservation.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail ?? '',
        guestPhone: dto.guestPhone,
        channel: dto.channel,
        checkIn: new Date(dto.checkIn),
        checkOut: new Date(dto.checkOut),
        nightlyRateCents: dto.nightlyRateCents,
        totalCents: dto.totalCents,
        cleaningFeeCents: dto.cleaningFeeCents ?? 0,
        notes: dto.notes,
        status: 'CONFIRMED',
      },
      include: { property: true, unit: true },
    });
  }
}
