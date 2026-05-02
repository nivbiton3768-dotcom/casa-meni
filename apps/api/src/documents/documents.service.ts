import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

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

  async create(organizationId: string, dto: CreateDocumentDto) {
    if (dto.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, organizationId },
      });
      if (!property) {
        throw new BadRequestException('Property not found in this organization');
      }
    }

    if (dto.leaseId) {
      const lease = await this.prisma.lease.findFirst({
        where: { id: dto.leaseId, organizationId },
      });
      if (!lease) {
        throw new BadRequestException('Lease not found in this organization');
      }
    }

    return this.prisma.document.create({
      data: {
        organizationId,
        name: dto.name,
        propertyId: dto.propertyId,
        leaseId: dto.leaseId,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
      include: {
        property: true,
        lease: { include: { tenant: true } },
      },
    });
  }
}
