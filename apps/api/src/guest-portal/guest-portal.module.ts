import { Module } from '@nestjs/common';
import { GuestPortalService } from './guest-portal.service';
import {
  GuestPortalPublicController,
  ReservationGuestTokenController,
} from './guest-portal.controller';

@Module({
  controllers: [GuestPortalPublicController, ReservationGuestTokenController],
  providers: [GuestPortalService],
})
export class GuestPortalModule {}
