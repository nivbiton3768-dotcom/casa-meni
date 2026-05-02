import { Module } from '@nestjs/common';
import { SigningService } from './signing.service';
import {
  SigningController,
  SigningAdminController,
} from './signing.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SigningController, SigningAdminController],
  providers: [SigningService],
  exports: [SigningService],
})
export class SigningModule {}
