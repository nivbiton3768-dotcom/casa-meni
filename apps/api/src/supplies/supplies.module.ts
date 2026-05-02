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
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  AdjustQtyDto,
  CreateSupplyDto,
  UpdateSupplyDto,
} from './dto/supplies.dto';

@Injectable()
export class SuppliesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    filters: { propertyId?: string; lowOnly?: boolean },
  ) {
    const items = await this.prisma.supplyItem.findMany({
      where: {
        organizationId,
        ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    if (filters.lowOnly) {
      return items.filter((i) => i.currentQty <= i.parLevel);
    }
    return items;
  }

  async create(organizationId: string, dto: CreateSupplyDto) {
    return this.prisma.supplyItem.create({
      data: {
        organizationId,
        propertyId: dto.propertyId ?? null,
        unitId: dto.unitId ?? null,
        name: dto.name,
        category: dto.category ?? null,
        unit: dto.unit ?? null,
        parLevel: dto.parLevel,
        currentQty: dto.currentQty,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateSupplyDto) {
    const existing = await this.prisma.supplyItem.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Supply item not found');
    return this.prisma.supplyItem.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        category: dto.category ?? undefined,
        unit: dto.unit ?? undefined,
        parLevel: dto.parLevel ?? undefined,
        currentQty: dto.currentQty ?? undefined,
        notes: dto.notes ?? undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.supplyItem.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Supply item not found');
    await this.prisma.supplyItem.delete({ where: { id } });
    return { ok: true };
  }

  async adjust(organizationId: string, id: string, dto: AdjustQtyDto) {
    const existing = await this.prisma.supplyItem.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Supply item not found');
    const newQty = Math.max(0, existing.currentQty + dto.delta);
    return this.prisma.supplyItem.update({
      where: { id },
      data: {
        currentQty: newQty,
        notes: dto.reason
          ? [existing.notes, `${new Date().toISOString().slice(0, 10)}: ${dto.delta > 0 ? '+' : ''}${dto.delta} (${dto.reason})`]
              .filter(Boolean)
              .join('\n')
          : existing.notes,
      },
    });
  }

  /** Generate a shopping list grouped by property. */
  async shoppingList(organizationId: string) {
    const items = await this.prisma.supplyItem.findMany({
      where: {
        organizationId,
        currentQty: { lte: this.prisma.supplyItem.fields.parLevel },
      },
      orderBy: [{ propertyId: 'asc' }, { category: 'asc' }],
    });
    // Prisma doesn't yet support comparing two columns; do it in memory if needed
    const low = items.filter((i) => i.currentQty <= i.parLevel);

    // Enrich with property names
    const propertyIds = Array.from(
      new Set(low.map((i) => i.propertyId).filter((x): x is string => Boolean(x))),
    );
    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, name: true },
    });
    const propMap = new Map(properties.map((p) => [p.id, p.name]));

    return low.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      unit: i.unit,
      need: i.parLevel - i.currentQty,
      currentQty: i.currentQty,
      parLevel: i.parLevel,
      propertyId: i.propertyId,
      propertyName: i.propertyId ? propMap.get(i.propertyId) ?? null : null,
    }));
  }
}

@Controller('supplies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'CLEANING_TEAM')
export class SuppliesController {
  constructor(private readonly service: SuppliesService) {}

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('propertyId') propertyId?: string,
    @Query('lowOnly') lowOnly?: string,
  ) {
    return this.service.list(organizationId, {
      propertyId,
      lowOnly: lowOnly === 'true' || lowOnly === '1',
    });
  }

  @Get('shopping-list')
  shoppingList(@CurrentUser('organizationId') organizationId: string) {
    return this.service.shoppingList(organizationId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateSupplyDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplyDto,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Patch(':id/adjust')
  adjust(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: AdjustQtyDto,
  ) {
    return this.service.adjust(organizationId, id, dto);
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
  controllers: [SuppliesController],
  providers: [SuppliesService],
})
export class SuppliesModule {}
