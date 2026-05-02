import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER, Role.ACCOUNTANT)
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(orgId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.transactionsService.findAll(orgId, propertyId);
  }

  @Get('pnl')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER, Role.ACCOUNTANT, Role.INVESTOR)
  getPnl(
    @CurrentUser('organizationId') orgId: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.transactionsService.getPnl(orgId, propertyId);
  }
}
