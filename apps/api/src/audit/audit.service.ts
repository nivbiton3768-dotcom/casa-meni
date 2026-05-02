import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(args: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    payload?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: args.userId,
        action: args.action,
        entity: args.entity,
        entityId: args.entityId,
        payload: args.payload ?? Prisma.JsonNull,
      },
    });
  }

  async list(
    organizationId: string,
    filters: { entity?: string; entityId?: string; userId?: string; limit?: number },
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        user: { organizationId },
        ...(filters.entity ? { entity: filters.entity } : {}),
        ...(filters.entityId ? { entityId: filters.entityId } : {}),
        ...(filters.userId ? { userId: filters.userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 100,
    });
  }
}
