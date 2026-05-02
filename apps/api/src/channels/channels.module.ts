import { Module } from '@nestjs/common';
import {
  ChannelsController,
  ChannelsExportController,
} from './channels.controller';
import { ChannelsService } from './channels.service';

@Module({
  controllers: [ChannelsController, ChannelsExportController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
