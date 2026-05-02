import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('entities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntitiesController {
  constructor(private readonly service: EntitiesService) {}

  @Post()
  @Roles(Role.OWNER)
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateEntityDto,
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

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateEntityDto>,
  ) {
    return this.service.update(orgId, id, dto);
  }
}
