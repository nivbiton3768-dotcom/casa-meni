import { Module } from '@nestjs/common';
import { TenantPortalService } from './tenant-portal.service';
import { TenantPortalController } from './tenant-portal.controller';

@Module({
  controllers: [TenantPortalController],
  providers: [TenantPortalService],
})
export class TenantPortalModule {}
