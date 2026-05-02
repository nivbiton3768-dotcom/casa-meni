import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RenovationsService } from './renovations.service';
import { CreateRenovationDto } from './dto/create-renovation.dto';
import { AddExpenseDto } from './dto/add-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, RenovationStatus } from '@prisma/client';

@Controller('renovations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RenovationsController {
  constructor(private readonly service: RenovationsService) {}

  @Post()
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateRenovationDto,
  ) {
    return this.service.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Post(':id/expenses')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER, Role.ACCOUNTANT)
  addExpense(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: AddExpenseDto,
  ) {
    return this.service.addExpense(orgId, id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  updateStatus(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body('status') status: RenovationStatus,
  ) {
    return this.service.updateStatus(orgId, id, status);
  }

  @Delete('expenses/:expenseId')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  deleteExpense(
    @CurrentUser('organizationId') orgId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.service.deleteExpense(orgId, expenseId);
  }
}
