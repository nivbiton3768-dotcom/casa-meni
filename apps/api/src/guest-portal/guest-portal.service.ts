import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuestPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureToken(reservationId: string, organizationId: string) {
    const r = await this.prisma.reservation.findFirst({
      where: { id: reservationId, organizationId },
    });
    if (!r) throw new NotFoundException('Reservation not found');
    if (r.guestToken) return { token: r.guestToken };
    const token = randomBytes(20).toString('hex');
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { guestToken: token },
    });
    return { token };
  }

  async getByToken(token: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { guestToken: token },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            imageUrl: true,
            wifiName: true,
            wifiPassword: true,
            parkingInfo: true,
            utilityNotes: true,
            applianceNotes: true,
            emergencyContacts: true,
            houseRules: true,
            localRecommendations: true,
          },
        },
        unit: {
          select: {
            unitNumber: true,
            bedrooms: true,
            bathrooms: true,
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Booking not found');
    return {
      reservation: {
        id: r.id,
        guestName: r.guestName,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
      },
      property: r.property,
      unit: r.unit,
    };
  }
}
