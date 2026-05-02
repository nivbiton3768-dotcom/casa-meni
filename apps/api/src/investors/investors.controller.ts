import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InvestorsService } from './investors.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('investors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvestorsController {
  constructor(private readonly service: InvestorsService) {}

  @Post()
  @Roles(Role.OWNER)
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateInvestorDto,
  ) {
    return this.service.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get('portfolio')
  getPortfolio(@CurrentUser('organizationId') orgId: string) {
    return this.service.getPortfolioSummary(orgId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(orgId, id);
  }

  @Get(':id/metrics')
  @Roles(Role.OWNER, Role.ACCOUNTANT, Role.INVESTOR)
  getInvestorMetrics(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.getInvestorMetrics(orgId, id);
  }

  @Get(':id/pnl')
  @Roles(Role.OWNER, Role.ACCOUNTANT, Role.INVESTOR)
  getInvestorPnl(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.getInvestorPnl(orgId, id);
  }

  @Post('distributions')
  @Roles(Role.OWNER, Role.ACCOUNTANT)
  createDistribution(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateDistributionDto,
  ) {
    return this.service.createDistribution(orgId, dto);
  }
}
