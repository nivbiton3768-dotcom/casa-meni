import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  type: 'property' | 'unit' | 'tenant' | 'vendor' | 'maintenance';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    organizationId: string,
    query: string,
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) return [];

    const term = query.trim();

    const [properties, units, tenants, vendors, jobs] = await Promise.all([
      this.prisma.property.findMany({
        where: {
          organizationId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { address: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      this.prisma.unit.findMany({
        where: {
          property: { organizationId },
          unitNumber: { contains: term, mode: 'insensitive' },
        },
        include: { property: { select: { id: true, name: true } } },
        take: 5,
      }),

      this.prisma.user.findMany({
        where: {
          organizationId,
          role: 'TENANT',
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      this.prisma.vendor.findMany({
        where: {
          organizationId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { trade: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      this.prisma.maintenanceJob.findMany({
        where: {
          organizationId,
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        include: { property: { select: { name: true } } },
        take: 5,
      }),
    ]);

    const results: SearchResult[] = [
      ...properties.map((p) => ({
        type: 'property' as const,
        id: p.id,
        title: p.name,
        subtitle: p.address,
        url: `/properties/${p.id}`,
      })),
      ...units.map((u) => ({
        type: 'unit' as const,
        id: u.id,
        title: `Unit ${u.unitNumber}`,
        subtitle: u.property.name,
        url: `/properties/${u.property.id}`,
      })),
      ...tenants.map((t) => ({
        type: 'tenant' as const,
        id: t.id,
        title: t.name,
        subtitle: t.email,
        url: '/tenants',
      })),
      ...vendors.map((v) => ({
        type: 'vendor' as const,
        id: v.id,
        title: v.name,
        subtitle: v.trade || 'Vendor',
        url: '/vendors',
      })),
      ...jobs.map((j) => ({
        type: 'maintenance' as const,
        id: j.id,
        title: j.title,
        subtitle: `${j.status} - ${j.property.name}`,
        url: '/maintenance',
      })),
    ];

    return results.slice(0, 20);
  }
}
