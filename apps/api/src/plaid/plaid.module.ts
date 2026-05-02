import { Global, Module } from '@nestjs/common';
import { PlaidService } from './plaid.service';

@Global()
@Module({
  providers: [PlaidService],
  exports: [PlaidService],
})
export class PlaidModule {}
