import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface ScanReceiptDto {
  jobId?: string;
  propertyId?: string;
  barcode?: string;
  description: string;
  amountCents: number;
  vendorName?: string;
  receiptUrl?: string;
}

@Injectable()
export class PartsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(organizationId: string, dto: ScanReceiptDto) {
    return this.prisma.partReceipt.create({
      data: {
        organizationId,
        jobId: dto.jobId,
        propertyId: dto.propertyId,
        barcode: dto.barcode,
        description: dto.description,
        amountCents: dto.amountCents,
        vendorName: dto.vendorName,
        receiptUrl: dto.receiptUrl,
      },
    });
  }

  async list(organizationId: string, jobId?: string) {
    return this.prisma.partReceipt.findMany({
      where: { organizationId, ...(jobId ? { jobId } : {}) },
      orderBy: { scannedAt: 'desc' },
      take: 200,
    });
  }

  /** Lookup a barcode in our prior scan history. Returns last seen description/price. */
  async lookup(organizationId: string, barcode: string) {
    const last = await this.prisma.partReceipt.findFirst({
      where: { organizationId, barcode },
      orderBy: { scannedAt: 'desc' },
    });
    if (!last) return { found: false };
    return {
      found: true,
      description: last.description,
      avgPriceCents: last.amountCents,
      vendorName: last.vendorName,
    };
  }
}

@Controller('parts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_TECH')
export class PartsController {
  constructor(private readonly service: PartsService) {}

  @Post('scan')
  scan(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ScanReceiptDto,
  ) {
    return this.service.record(organizationId, dto);
  }

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('jobId') jobId?: string,
  ) {
    return this.service.list(organizationId, jobId);
  }

  @Get('lookup/:barcode')
  lookup(
    @CurrentUser('organizationId') organizationId: string,
    @Param('barcode') barcode: string,
  ) {
    return this.service.lookup(organizationId, barcode);
  }
}

@Module({
  controllers: [PartsController],
  providers: [PartsService],
})
export class PartsModule {}
