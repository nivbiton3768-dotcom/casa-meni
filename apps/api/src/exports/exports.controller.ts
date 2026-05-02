import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportsService } from './exports.service';

const sendCsv = (res: Response, filename: string, body: string) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  res.send(body);
};

@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Get('transactions.csv')
  async transactions(
    @CurrentUser('organizationId') organizationId: string,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    const csv = await this.service.transactionsCsv(organizationId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      propertyId,
    });
    sendCsv(
      res,
      `casa-meni-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  }

  @Get('rent-roll.csv')
  async rentRoll(
    @CurrentUser('organizationId') organizationId: string,
    @Res() res: Response,
  ) {
    const csv = await this.service.rentRollCsv(organizationId);
    sendCsv(
      res,
      `casa-meni-rent-roll-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  }

  @Get('reservations.csv')
  async reservations(
    @CurrentUser('organizationId') organizationId: string,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.service.reservationsCsv(organizationId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    sendCsv(
      res,
      `casa-meni-reservations-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  }
}
