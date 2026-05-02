import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('units')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.unitsService.create(orgId, dto);
  }

  @Get()
  findByProperty(
    @CurrentUser('organizationId') orgId: string,
    @Query('propertyId') propertyId: string,
  ) {
    return this.unitsService.findByProperty(orgId, propertyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.PROPERTY_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }
}
