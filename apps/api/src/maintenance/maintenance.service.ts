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
}
