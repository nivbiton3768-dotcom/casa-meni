import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BankingService } from './banking.service';
import {
  CreateManualAccountDto,
  CreateManualTransactionDto,
  ExchangePublicTokenDto,
  ImportCsvDto,
  MatchTransactionDto,
} from './dto/banking.dto';
import {
  BankTransactionDirection,
  BankTransactionMatchStatus,
} from '@prisma/client';

@Controller('banking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class BankingController {
  constructor(private readonly service: BankingService) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Post('link-token')
  createLinkToken(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.service.createLinkToken(userId, organizationId);
  }

  @Post('exchange-token')
  exchange(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ExchangePublicTokenDto,
  ) {
    return this.service.exchangePublicToken(organizationId, dto.publicToken);
  }

  @Post('sync')
  sync(@CurrentUser('organizationId') organizationId: string) {
    return this.service.syncAll(organizationId);
  }

  @Post('register-webhooks')
  registerWebhooks(@CurrentUser('organizationId') organizationId: string) {
    return this.service.registerWebhooks(organizationId);
  }

  @Post('backfill-counterparties')
  backfillCounterparties(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.service.backfillCounterparties(organizationId);
  }

  @Get('accounts')
  listAccounts(@CurrentUser('organizationId') organizationId: string) {
    return this.service.listAccounts(organizationId);
  }

  @Post('accounts/manual')
  createManualAccount(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateManualAccountDto,
  ) {
    return this.service.createManualAccount(organizationId, dto);
  }

  @Delete('accounts/:id')
  disconnectAccount(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.disconnectAccount(organizationId, id);
  }

  @Get('transactions')
  listTransactions(
    @CurrentUser('organizationId') organizationId: string,
    @Query('bankAccountId') bankAccountId?: string,
    @Query('matchStatus') matchStatus?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
  ) {
    const validStatuses: Record<string, BankTransactionMatchStatus> = {
      UNMATCHED: BankTransactionMatchStatus.UNMATCHED,
      MATCHED: BankTransactionMatchStatus.MATCHED,
      IGNORED: BankTransactionMatchStatus.IGNORED,
      REVIEW: BankTransactionMatchStatus.REVIEW,
    };
    const validDirections: Record<string, BankTransactionDirection> = {
      INCOMING: BankTransactionDirection.INCOMING,
      OUTGOING: BankTransactionDirection.OUTGOING,
    };
    if (matchStatus && !validStatuses[matchStatus]) {
      throw new BadRequestException(`Invalid matchStatus: ${matchStatus}`);
    }
    if (direction && !validDirections[direction]) {
      throw new BadRequestException(`Invalid direction: ${direction}`);
    }
    return this.service.listTransactions(organizationId, {
      bankAccountId,
      matchStatus: matchStatus ? validStatuses[matchStatus] : undefined,
      direction: direction ? validDirections[direction] : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('transactions/manual')
  createManualTransaction(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateManualTransactionDto,
  ) {
    return this.service.createManualTransaction(organizationId, dto);
  }

  @Post('transactions/import')
  importCsv(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ImportCsvDto,
  ) {
    return this.service.importCsv(organizationId, dto);
  }

  @Post('transactions/:id/match')
  matchTransaction(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: MatchTransactionDto,
  ) {
    return this.service.matchTransaction(organizationId, id, dto.paymentId);
  }

  @Post('transactions/:id/unmatch')
  unmatchTransaction(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.unmatchTransaction(organizationId, id);
  }

  @Post('transactions/:id/ignore')
  ignoreTransaction(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.ignoreTransaction(organizationId, id);
  }

  @Get('unpaid-payments')
  listUnpaidPayments(@CurrentUser('organizationId') organizationId: string) {
    return this.service.listUnpaidPayments(organizationId);
  }
}
