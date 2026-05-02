import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DealKind, DealStage, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface CreateDealDto {
  kind?: DealKind;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  askPriceCents?: number;
  offerPriceCents?: number;
  estimatedRentCents?: number;
  estimatedExpensesCents?: number;
  estimatedRehabCents?: number;
  notes?: string;
}

interface CompDto {
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  soldPrice?: number;
  soldDate?: string;
  notes?: string;
}

interface DiligenceDto {
  category: string;
  item: string;
  notes?: string;
}

const DEFAULT_DILIGENCE: Array<{ category: string; item: string }> = [
  { category: 'Inspection', item: 'General property inspection' },
  { category: 'Inspection', item: 'Termite/pest inspection' },
  { category: 'Inspection', item: 'Roof inspection' },
  { category: 'Inspection', item: 'HVAC inspection' },
  { category: 'Inspection', item: 'Sewer scope' },
  { category: 'Title', item: 'Title search' },
  { category: 'Title', item: 'Title insurance binder' },
  { category: 'Financing', item: 'Pre-approval letter' },
  { category: 'Financing', item: 'Appraisal' },
  { category: 'Financing', item: 'Loan commitment' },
  { category: 'Legal', item: 'Purchase agreement reviewed' },
  { category: 'Legal', item: 'Disclosures reviewed' },
  { category: 'Insurance', item: 'Hazard insurance quote' },
  { category: 'Financials', item: 'Verify rent rolls' },
  { category: 'Financials', item: 'Verify expense statements' },
];

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Underwriting math: NOI, cap rate, cash-on-cash. */
  recalcMetrics(deal: {
    estimatedRentCents: number | null;
    estimatedExpensesCents: number | null;
    estimatedRehabCents: number | null;
    offerPriceCents: number | null;
    askPriceCents: number | null;
  }) {
    const annualRent = (deal.estimatedRentCents ?? 0) * 12;
    const annualExp = (deal.estimatedExpensesCents ?? 0) * 12;
    const noi = annualRent - annualExp;
    const price = deal.offerPriceCents ?? deal.askPriceCents ?? 0;
    const totalIn = price + (deal.estimatedRehabCents ?? 0);
    const capRateBps = price > 0 ? Math.round((noi / price) * 10000) : null;
    // Assume 25% down for cash-on-cash mvp
    const downPayment = Math.round(totalIn * 0.25);
    const cashOnCashBps = downPayment > 0 ? Math.round((noi / downPayment) * 10000) : null;
    return { noiAnnualCents: noi, capRateBps, cashOnCashBps };
  }

  /** Score 0-100 based on cap rate, rehab ratio, and presence of comps. */
  scoreDeal(deal: {
    capRateBps: number | null;
    estimatedRehabCents: number | null;
    offerPriceCents: number | null;
    compCount: number;
  }) {
    let score = 50;
    if (deal.capRateBps != null) {
      // 8%+ cap rate is great in most markets, 4%- is poor
      if (deal.capRateBps >= 800) score += 30;
      else if (deal.capRateBps >= 600) score += 20;
      else if (deal.capRateBps >= 400) score += 10;
      else score -= 15;
    }
    const rehab = deal.estimatedRehabCents ?? 0;
    const offer = deal.offerPriceCents ?? 0;
    if (offer > 0) {
      const rehabPct = rehab / offer;
      if (rehabPct < 0.05) score += 5;
      else if (rehabPct > 0.25) score -= 10;
    }
    if (deal.compCount >= 3) score += 10;
    return Math.max(0, Math.min(100, score));
  }

  async list(organizationId: string, filters: { stage?: DealStage; kind?: DealKind }) {
    return this.prisma.deal.findMany({
      where: {
        organizationId,
        ...(filters.stage ? { stage: filters.stage } : {}),
        ...(filters.kind ? { kind: filters.kind } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { comps: true, diligence: true } } },
    });
  }

  async get(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: { comps: true, diligence: { orderBy: { orderIdx: 'asc' } } },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async create(organizationId: string, dto: CreateDealDto) {
    const metrics = this.recalcMetrics({
      estimatedRentCents: dto.estimatedRentCents ?? null,
      estimatedExpensesCents: dto.estimatedExpensesCents ?? null,
      estimatedRehabCents: dto.estimatedRehabCents ?? null,
      offerPriceCents: dto.offerPriceCents ?? null,
      askPriceCents: dto.askPriceCents ?? null,
    });
    const score = this.scoreDeal({ ...metrics, estimatedRehabCents: dto.estimatedRehabCents ?? null, offerPriceCents: dto.offerPriceCents ?? null, compCount: 0 });
    const deal = await this.prisma.deal.create({
      data: {
        organizationId,
        kind: dto.kind ?? 'ACQUISITION',
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        askPriceCents: dto.askPriceCents,
        offerPriceCents: dto.offerPriceCents,
        estimatedRentCents: dto.estimatedRentCents,
        estimatedExpensesCents: dto.estimatedExpensesCents,
        estimatedRehabCents: dto.estimatedRehabCents,
        notes: dto.notes,
        ...metrics,
        aiScore: score,
        diligence: {
          create: DEFAULT_DILIGENCE.map((d, idx) => ({
            category: d.category,
            item: d.item,
            orderIdx: idx,
          })),
        },
      },
      include: { comps: true, diligence: true },
    });
    return deal;
  }

  async update(organizationId: string, id: string, dto: Partial<CreateDealDto> & { stage?: DealStage }) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Deal not found');
    const merged = { ...deal, ...dto };
    const metrics = this.recalcMetrics(merged);
    const compCount = await this.prisma.dealComp.count({ where: { dealId: id } });
    const score = this.scoreDeal({ ...metrics, estimatedRehabCents: merged.estimatedRehabCents ?? null, offerPriceCents: merged.offerPriceCents ?? null, compCount });
    return this.prisma.deal.update({
      where: { id },
      data: {
        kind: dto.kind,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        stage: dto.stage,
        askPriceCents: dto.askPriceCents,
        offerPriceCents: dto.offerPriceCents,
        estimatedRentCents: dto.estimatedRentCents,
        estimatedExpensesCents: dto.estimatedExpensesCents,
        estimatedRehabCents: dto.estimatedRehabCents,
        notes: dto.notes,
        ...metrics,
        aiScore: score,
      },
    });
  }

  async addComp(organizationId: string, dealId: string, dto: CompDto) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal not found');
    return this.prisma.dealComp.create({
      data: {
        dealId,
        address: dto.address,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms ? new Prisma.Decimal(dto.bathrooms) : null,
        sqft: dto.sqft,
        soldPrice: dto.soldPrice,
        soldDate: dto.soldDate ? new Date(dto.soldDate) : null,
        pricePerSqft: dto.sqft && dto.soldPrice ? Math.round(dto.soldPrice / dto.sqft) : null,
        notes: dto.notes,
      },
    });
  }

  async toggleDiligence(organizationId: string, dealId: string, diligenceId: string) {
    const item = await this.prisma.dealDiligence.findFirst({
      where: { id: diligenceId, deal: { id: dealId, organizationId } },
    });
    if (!item) throw new NotFoundException('Diligence item not found');
    return this.prisma.dealDiligence.update({
      where: { id: diligenceId },
      data: { done: !item.done, doneAt: !item.done ? new Date() : null },
    });
  }

  async addDiligenceItem(organizationId: string, dealId: string, dto: DiligenceDto) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal not found');
    const max = await this.prisma.dealDiligence.findFirst({
      where: { dealId },
      orderBy: { orderIdx: 'desc' },
    });
    return this.prisma.dealDiligence.create({
      data: {
        dealId,
        category: dto.category,
        item: dto.item,
        notes: dto.notes,
        orderIdx: (max?.orderIdx ?? -1) + 1,
      },
    });
  }

  /** Convert a WON deal into a Property + close-out. */
  async convertToProperty(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (!deal.address || !deal.city || !deal.state || !deal.zip) {
      throw new BadRequestException('Deal must have full address before converting');
    }
    const property = await this.prisma.property.create({
      data: {
        organizationId,
        name: deal.name,
        address: deal.address,
        city: deal.city,
        state: deal.state,
        zip: deal.zip,
        type: 'LONG_TERM_RENTAL',
        purchasePrice: deal.offerPriceCents ?? null,
        purchaseDate: new Date(),
        notes: deal.notes,
      },
    });
    await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: 'WON',
        closedAt: new Date(),
        propertyId: property.id,
      },
    });
    return property;
  }

  async remove(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId } });
    if (!deal) throw new NotFoundException('Deal not found');
    await this.prisma.deal.delete({ where: { id } });
    return { ok: true };
  }
}

@Controller('deals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT', 'PROPERTY_MANAGER')
export class DealsController {
  constructor(private readonly service: DealsService) {}

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('stage') stage?: DealStage,
    @Query('kind') kind?: DealKind,
  ) {
    return this.service.list(organizationId, { stage, kind });
  }

  @Get(':id')
  get(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(organizationId, id);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateDealDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateDealDto> & { stage?: DealStage },
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Post(':id/comps')
  addComp(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: CompDto,
  ) {
    return this.service.addComp(organizationId, id, dto);
  }

  @Post(':id/diligence')
  addDiligence(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: DiligenceDto,
  ) {
    return this.service.addDiligenceItem(organizationId, id, dto);
  }

  @Patch(':id/diligence/:diligenceId/toggle')
  toggleDiligence(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Param('diligenceId') diligenceId: string,
  ) {
    return this.service.toggleDiligence(organizationId, id, diligenceId);
  }

  @Post(':id/convert')
  convert(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.convertToProperty(organizationId, id);
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
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
