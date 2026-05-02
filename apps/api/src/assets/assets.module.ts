import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssetType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CreateAssetDto {
  propertyId: string;
  unitId?: string;
  type: AssetType;
  name: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpires?: string;
  notes?: string;
  smartLockProvider?: string;
  smartLockDeviceId?: string;
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, filters: { propertyId?: string; type?: AssetType }) {
    return this.prisma.asset.findMany({
      where: {
        organizationId,
        ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      orderBy: [{ propertyId: 'asc' }, { type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(organizationId: string, dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        type: dto.type,
        name: dto.name,
        brand: dto.brand,
        modelNumber: dto.modelNumber,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchaseCost: dto.purchaseCost,
        warrantyExpires: dto.warrantyExpires ? new Date(dto.warrantyExpires) : null,
        notes: dto.notes,
        smartLockProvider: dto.smartLockProvider,
        smartLockDeviceId: dto.smartLockDeviceId,
      },
    });
  }

  async update(organizationId: string, id: string, dto: Partial<CreateAssetDto>) {
    const asset = await this.prisma.asset.findFirst({ where: { id, organizationId } });
    if (!asset) throw new NotFoundException('Asset not found');
    return this.prisma.asset.update({
      where: { id },
      data: {
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        type: dto.type,
        name: dto.name,
        brand: dto.brand,
        modelNumber: dto.modelNumber,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchaseCost: dto.purchaseCost,
        warrantyExpires: dto.warrantyExpires ? new Date(dto.warrantyExpires) : undefined,
        notes: dto.notes,
        smartLockProvider: dto.smartLockProvider,
        smartLockDeviceId: dto.smartLockDeviceId,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, organizationId } });
    if (!asset) throw new NotFoundException('Asset not found');
    await this.prisma.asset.delete({ where: { id } });
    return { ok: true };
  }

  /** Service history: maintenance jobs that mention this asset by serialNumber/modelNumber. */
  async serviceHistory(organizationId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, organizationId } });
    if (!asset) throw new NotFoundException('Asset not found');
    const filters: Prisma.MaintenanceJobWhereInput = {
      organizationId,
      propertyId: asset.propertyId,
    };
    const search = asset.serialNumber || asset.modelNumber || asset.name;
    if (search) {
      filters.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const jobs = await this.prisma.maintenanceJob.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { asset, jobs };
  }

  /** Warranties expiring in the next 60 days. */
  async warrantyAlerts(organizationId: string) {
    const soon = new Date();
    soon.setDate(soon.getDate() + 60);
    return this.prisma.asset.findMany({
      where: {
        organizationId,
        warrantyExpires: { gte: new Date(), lte: soon },
      },
      orderBy: { warrantyExpires: 'asc' },
    });
  }
}

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_TECH')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('propertyId') propertyId?: string,
    @Query('type') type?: AssetType,
  ) {
    return this.service.list(organizationId, { propertyId, type });
  }

  @Get('warranty-alerts')
  warranties(@CurrentUser('organizationId') organizationId: string) {
    return this.service.warrantyAlerts(organizationId);
  }

  @Get(':id/history')
  history(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.serviceHistory(organizationId, id);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAssetDto>,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(organizationId, id);
  }
}

@Module({
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
