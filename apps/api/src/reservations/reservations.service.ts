import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
