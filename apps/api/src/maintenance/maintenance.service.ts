import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobStatus } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateJobDto) {
    return this.prisma.maintenanceJob.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        category: dto.category,
      },
      include: { property: true, unit: true, createdBy: true },
    });
  }

  async findAll(organizationId: string, status?: JobStatus) {
    return this.prisma.maintenanceJob.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        property: true,
        unit: true,
        assignedTo: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const job = await this.prisma.maintenanceJob.findFirst({
      where: { id, organizationId },
      include: {
        property: true,
        unit: true,
        assignedTo: true,
        createdBy: true,
        messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async assign(organizationId: string, id: string, techId: string) {
    await this.findOne(organizationId, id);
    return this.prisma.maintenanceJob.update({
      where: { id },
      data: { assignedToId: techId, status: 'IN_PROGRESS' },
    });
  }

  async updateStatus(organizationId: string, id: string, status: JobStatus) {
    await this.findOne(organizationId, id);
    return this.prisma.maintenanceJob.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  async addMessage(jobId: string, senderId: string, body: string) {
    return this.prisma.message.create({
      data: { jobId, senderId, body },
      include: { sender: true },
    });
  }

  /** Tenant submits a rating for a completed job. */
  async rate(
    jobId: string,
    tenantId: string,
    rating: number,
    comment?: string,
  ) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be 1-5');
    }
    const job = await this.prisma.maintenanceJob.findFirst({
      where: {
        id: jobId,
        unit: { leases: { some: { tenantId } } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'COMPLETED') {
      throw new Error('You can only rate completed jobs');
    }
    return this.prisma.maintenanceJob.update({
      where: { id: jobId },
      data: {
        rating,
        ratingComment: comment ?? null,
        ratedAt: new Date(),
      },
    });
  }

  /** Compute aggregate scores per technician across an organization. */
  async getTechnicianScores(organizationId: string) {
    const techs = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['MAINTENANCE_TECH', 'VENDOR'] },
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const result: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      jobsCompleted: number;
      jobsOpen: number;
      avgRating: number | null;
      ratingsCount: number;
      avgResolutionHours: number | null;
    }> = [];

    for (const t of techs) {
      const jobs = await this.prisma.maintenanceJob.findMany({
        where: { organizationId, assignedToId: t.id },
        select: {
          status: true,
          rating: true,
          createdAt: true,
          completedAt: true,
        },
      });
      const completed = jobs.filter((j) => j.status === 'COMPLETED');
      const ratings = jobs
        .map((j) => j.rating)
        .filter((r): r is number => typeof r === 'number');

      const resolutionHours = completed
        .map((j) =>
          j.completedAt
            ? (j.completedAt.getTime() - j.createdAt.getTime()) / 3_600_000
            : null,
        )
        .filter((h): h is number => h !== null);

      result.push({
        id: t.id,
        name: t.name,
        email: t.email,
        role: t.role,
        jobsCompleted: completed.length,
        jobsOpen: jobs.length - completed.length,
        avgRating:
          ratings.length > 0
            ? Number(
                (
                  ratings.reduce((a, b) => a + b, 0) / ratings.length
                ).toFixed(2),
              )
            : null,
        ratingsCount: ratings.length,
        avgResolutionHours:
          resolutionHours.length > 0
            ? Number(
                (
                  resolutionHours.reduce((a, b) => a + b, 0) /
                  resolutionHours.length
                ).toFixed(1),
              )
            : null,
      });
    }
    return result.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
  }
}
