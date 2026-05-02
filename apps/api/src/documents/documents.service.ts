import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.document.findMany({
      where: { organizationId },
      include: {
        property: true,
        lease: { include: { tenant: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
