import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  Module,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    filter: { role?: Role; search?: string },
  ) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(filter.role ? { role: filter.role } : {}),
        ...(filter.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { email: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    let typedRole: Role | undefined;
    if (role) {
      if (!(role in Role)) {
        throw new BadRequestException(`Invalid role: ${role}`);
      }
      typedRole = role as Role;
    }
    return this.service.list(organizationId, { role: typedRole, search });
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
