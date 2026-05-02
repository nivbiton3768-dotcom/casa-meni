import { Module } from '@nestjs/common';
import { RenovationsService } from './renovations.service';
import { RenovationsController } from './renovations.controller';
import {
  RenovationMilestonesController,
  RenovationMilestonesService,
} from './renovation-milestones.controller';

@Module({
  controllers: [RenovationsController, RenovationMilestonesController],
  providers: [RenovationsService, RenovationMilestonesService],
  exports: [RenovationsService],
})
export class RenovationsModule {}
