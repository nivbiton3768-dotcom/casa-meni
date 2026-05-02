import { Module } from '@nestjs/common';
import { RenovationsService } from './renovations.service';
import { RenovationsController } from './renovations.controller';

@Module({
  controllers: [RenovationsController],
  providers: [RenovationsService],
  exports: [RenovationsService],
})
export class RenovationsModule {}
