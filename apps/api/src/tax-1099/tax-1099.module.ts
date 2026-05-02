import {
  Controller,
  Get,
  Header,
  Injectable,
  Module,
  Param,
  Post,
  Query,
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

const REPORTABLE_THRESHOLD_CENTS = 60000; // $600 IRS threshold

@Injectable()
export class Tax1099Service {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregate vendor totals for the given tax year. */
  async aggregate(organizationId: string, taxYear: number) {
    const start = new Date(`${taxYear}-01-01T00:00:00Z`);
    const end = new Date(`${taxYear + 1}-01-01T00:00:00Z`);

    // Sum transactions per vendor + sum renovation expenses per vendor.
    const txSums = await this.prisma.transaction.groupBy({
      by: ['vendorId'],
      where: {
        organizationId,
        date: { gte: start, lt: end },
        vendorId: { not: null },
        type: 'EXPENSE',
      },
      _sum: { amountCents: true },
    });
    const renoSums = await this.prisma.renovationExpense.groupBy({
      by: ['vendorId'],
      where: {
        renovation: { property: { organizationId } },
        date: { gte: start, lt: end },
        vendorId: { not: null },
      },
      _sum: { amountCents: true },
    });

    const totals = new Map<string, number>();
    for (const t of txSums) {
      if (!t.vendorId) continue;
      totals.set(t.vendorId, (totals.get(t.vendorId) ?? 0) + (t._sum.amountCents ?? 0));
    }
    for (const r of renoSums) {
      if (!r.vendorId) continue;
      totals.set(r.vendorId, (totals.get(r.vendorId) ?? 0) + (r._sum.amountCents ?? 0));
    }

    const vendors = await this.prisma.vendor.findMany({
      where: {
        organizationId,
        id: { in: Array.from(totals.keys()) },
      },
    });

    return vendors
      .map((v) => ({
        vendor: v,
        totalCents: totals.get(v.id) ?? 0,
        reportable:
          v.is1099Required &&
          (totals.get(v.id) ?? 0) >= REPORTABLE_THRESHOLD_CENTS,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  /** Snapshot the totals into VendorTaxYear so reports stay reproducible. */
  async snapshot(organizationId: string, taxYear: number) {
    const data = await this.aggregate(organizationId, taxYear);
    const ops = data.map((row) =>
      this.prisma.vendorTaxYear.upsert({
        where: { vendorId_taxYear: { vendorId: row.vendor.id, taxYear } },
        create: {
          organizationId,
          vendorId: row.vendor.id,
          taxYear,
          totalCents: row.totalCents,
          taxIdLast4: row.vendor.taxId ? row.vendor.taxId.slice(-4) : null,
        },
        update: {
          totalCents: row.totalCents,
          taxIdLast4: row.vendor.taxId ? row.vendor.taxId.slice(-4) : null,
        },
      }),
    );
    await this.prisma.$transaction(ops);
    return { taxYear, vendors: data.length, reportable: data.filter((d) => d.reportable).length };
  }

  /** Render a simplified 1099-NEC equivalent statement as a PDF. */
  async renderPdf(organizationId: string, vendorId: string, taxYear: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, organizationId },
      include: { organization: true },
    });
    if (!vendor) throw new Error('Vendor not found');
    const data = await this.aggregate(organizationId, taxYear);
    const row = data.find((d) => d.vendor.id === vendorId);
    if (!row) throw new Error('No payments to vendor in that year');

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]); // letter
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    page.drawText('Form 1099-NEC EQUIVALENT STATEMENT', {
      x: 40, y: 740, size: 18, font: bold, color: rgb(0, 0, 0),
    });
    page.drawText(`Tax Year ${taxYear}`, {
      x: 40, y: 715, size: 12, font, color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText('PAYER', { x: 40, y: 670, size: 11, font: bold });
    page.drawText(vendor.organization.name, { x: 40, y: 654, size: 11, font });

    page.drawText('RECIPIENT', { x: 320, y: 670, size: 11, font: bold });
    page.drawText(vendor.name, { x: 320, y: 654, size: 11, font });
    if (vendor.address) {
      page.drawText(vendor.address, { x: 320, y: 640, size: 10, font });
    }
    if (vendor.taxId) {
      page.drawText(`TIN: ***-**-${vendor.taxId.slice(-4)}`, {
        x: 320, y: 624, size: 10, font,
      });
    }

    page.drawLine({
      start: { x: 40, y: 580 }, end: { x: 572, y: 580 },
      thickness: 1, color: rgb(0, 0, 0),
    });

    page.drawText('Box 1 — Nonemployee compensation', {
      x: 40, y: 555, size: 12, font: bold,
    });
    page.drawText(`$${(row.totalCents / 100).toFixed(2)}`, {
      x: 400, y: 555, size: 14, font: bold,
    });

    page.drawText(
      'This statement summarizes payments made to the recipient. Use it to file Form 1099-NEC with the IRS via paper, FIRE, or an authorized e-file provider. This document is for informational purposes only and is not an IRS-filed copy.',
      { x: 40, y: 480, size: 9, font, maxWidth: 532, lineHeight: 12 },
    );

    page.drawText(`Generated by Casa Meni on ${new Date().toLocaleDateString()}`, {
      x: 40, y: 60, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    });

    return pdf.save();
  }
}

@Controller('tax-1099')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT')
export class Tax1099Controller {
  constructor(private readonly service: Tax1099Service) {}

  @Get(':taxYear')
  aggregate(
    @CurrentUser('organizationId') organizationId: string,
    @Param('taxYear') taxYear: string,
  ) {
    return this.service.aggregate(organizationId, Number(taxYear));
  }

  @Post(':taxYear/snapshot')
  snapshot(
    @CurrentUser('organizationId') organizationId: string,
    @Param('taxYear') taxYear: string,
  ) {
    return this.service.snapshot(organizationId, Number(taxYear));
  }

  @Get(':taxYear/vendor/:vendorId/pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @CurrentUser('organizationId') organizationId: string,
    @Param('taxYear') taxYear: string,
    @Param('vendorId') vendorId: string,
    @Res() res: Response,
  ) {
    const bytes = await this.service.renderPdf(
      organizationId,
      vendorId,
      Number(taxYear),
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="1099-${vendorId}-${taxYear}.pdf"`,
    );
    res.end(Buffer.from(bytes));
  }
}

@Module({
  controllers: [Tax1099Controller],
  providers: [Tax1099Service],
})
export class Tax1099Module {}
