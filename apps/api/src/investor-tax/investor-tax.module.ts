import {
  Controller,
  Get,
  Header,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class InvestorTaxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Compute investor's pro-rata share of income/expenses for a tax year. */
  async compute(organizationId: string, investorId: string, taxYear: number) {
    const investor = await this.prisma.investor.findFirst({
      where: { id: investorId, organizationId },
      include: {
        entity: {
          include: {
            properties: { select: { id: true } },
          },
        },
      },
    });
    if (!investor) throw new NotFoundException('Investor not found');

    const ownershipPct = Number(investor.ownershipPct ?? 0); // 0-100

    const start = new Date(`${taxYear}-01-01T00:00:00Z`);
    const end = new Date(`${taxYear + 1}-01-01T00:00:00Z`);

    const propertyIds = investor.entity?.properties.map((p) => p.id) ?? [];
    if (propertyIds.length === 0) {
      return {
        taxYear,
        investor,
        ownershipPct,
        incomeCents: 0,
        expenseCents: 0,
        netCents: 0,
        distributionsCents: 0,
        share: { incomeCents: 0, expenseCents: 0, netCents: 0 },
      };
    }

    const txAgg = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        organizationId,
        propertyId: { in: propertyIds },
        date: { gte: start, lt: end },
      },
      _sum: { amountCents: true },
    });
    const incomeCents = txAgg.find((t) => t.type === 'INCOME')?._sum.amountCents ?? 0;
    const expenseCents = txAgg.find((t) => t.type === 'EXPENSE')?._sum.amountCents ?? 0;
    const netCents = incomeCents - expenseCents;

    const distributions = await this.prisma.distribution.aggregate({
      where: {
        investorId,
        date: { gte: start, lt: end },
      },
      _sum: { amountCents: true },
    });

    return {
      taxYear,
      investor,
      ownershipPct,
      incomeCents,
      expenseCents,
      netCents,
      distributionsCents: distributions._sum.amountCents ?? 0,
      share: {
        incomeCents: Math.round((incomeCents * ownershipPct) / 100),
        expenseCents: Math.round((expenseCents * ownershipPct) / 100),
        netCents: Math.round((netCents * ownershipPct) / 100),
      },
    };
  }

  async snapshot(organizationId: string, investorId: string, taxYear: number) {
    const data = await this.compute(organizationId, investorId, taxYear);
    return this.prisma.investorTaxStatement.upsert({
      where: { investorId_taxYear: { investorId, taxYear } },
      create: {
        investorId,
        taxYear,
        incomeCents: data.share.incomeCents,
        expenseCents: data.share.expenseCents,
        distributionsCents: data.distributionsCents,
        netCents: data.share.netCents,
      },
      update: {
        incomeCents: data.share.incomeCents,
        expenseCents: data.share.expenseCents,
        distributionsCents: data.distributionsCents,
        netCents: data.share.netCents,
      },
    });
  }

  async renderPdf(organizationId: string, investorId: string, taxYear: number) {
    const data = await this.compute(organizationId, investorId, taxYear);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    page.drawText('K-1 EQUIVALENT — Investor Tax Statement', {
      x: 40, y: 740, size: 18, font: bold,
    });
    page.drawText(`Tax Year ${taxYear}`, { x: 40, y: 715, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

    page.drawText('PARTNERSHIP', { x: 40, y: 670, size: 11, font: bold });
    page.drawText(org?.name ?? '', { x: 40, y: 654, size: 11, font });

    page.drawText('PARTNER', { x: 320, y: 670, size: 11, font: bold });
    page.drawText(data.investor.name, { x: 320, y: 654, size: 11, font });
    page.drawText(`Ownership: ${data.ownershipPct.toFixed(2)}%`, { x: 320, y: 640, size: 10, font });

    page.drawLine({ start: { x: 40, y: 600 }, end: { x: 572, y: 600 }, thickness: 1 });

    let y = 575;
    const row = (label: string, value: number) => {
      page.drawText(label, { x: 40, y, size: 11, font });
      page.drawText(`$${(value / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, {
        x: 420, y, size: 11, font: bold,
      });
      y -= 22;
    };

    row('Total partnership income', data.incomeCents);
    row('Total partnership expenses', data.expenseCents);
    row('Net income (loss)', data.netCents);
    y -= 8;
    page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
    y -= 22;
    row('Your share of income', data.share.incomeCents);
    row('Your share of expenses', data.share.expenseCents);
    row('Your share of net income (loss)', data.share.netCents);
    row('Distributions received', data.distributionsCents);

    page.drawText(
      'This is an equivalent statement only — not an IRS-filed Schedule K-1. Provide to your CPA when filing personal taxes.',
      { x: 40, y: 100, size: 8, font, maxWidth: 532, lineHeight: 11, color: rgb(0.4, 0.4, 0.4) },
    );

    return pdf.save();
  }
}

@Controller('investor-tax')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT')
export class InvestorTaxController {
  constructor(private readonly service: InvestorTaxService) {}

  @Get(':investorId/:taxYear')
  compute(
    @CurrentUser('organizationId') organizationId: string,
    @Param('investorId') investorId: string,
    @Param('taxYear') taxYear: string,
  ) {
    return this.service.compute(organizationId, investorId, Number(taxYear));
  }

  @Post(':investorId/:taxYear/snapshot')
  snapshot(
    @CurrentUser('organizationId') organizationId: string,
    @Param('investorId') investorId: string,
    @Param('taxYear') taxYear: string,
  ) {
    return this.service.snapshot(organizationId, investorId, Number(taxYear));
  }

  @Get(':investorId/:taxYear/pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @CurrentUser('organizationId') organizationId: string,
    @Param('investorId') investorId: string,
    @Param('taxYear') taxYear: string,
    @Res() res: Response,
  ) {
    const bytes = await this.service.renderPdf(
      organizationId,
      investorId,
      Number(taxYear),
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="k1-${investorId}-${taxYear}.pdf"`,
    );
    res.end(Buffer.from(bytes));
  }
}

@Module({
  controllers: [InvestorTaxController],
  providers: [InvestorTaxService],
})
export class InvestorTaxModule {}
