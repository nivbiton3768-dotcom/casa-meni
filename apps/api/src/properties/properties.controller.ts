import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get('dashboard-stats')
  getDashboardStats(@CurrentUser('organizationId') orgId: string) {
    return this.propertiesService.getDashboardStats(orgId);
  }

  @Get('map')
  listForMap(@CurrentUser('organizationId') orgId: string) {
    return this.propertiesService.listMap(orgId);
  }

  @Get('compare')
  compare(
    @CurrentUser('organizationId') orgId: string,
    @Query('ids') ids: string,
  ) {
    const list = (ids ?? '').split(',').filter(Boolean);
    return this.propertiesService.compare(orgId, list);
  }

  @Post()
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertiesService.create(orgId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.propertiesService.findAll(
      orgId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.propertiesService.findOne(orgId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  remove(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.propertiesService.remove(orgId, id);
  }
}
