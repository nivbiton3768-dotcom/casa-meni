import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { TransactionMatcherService } from './transaction-matcher.service';

@Module({
  controllers: [BankingController],
  providers: [BankingService, TransactionMatcherService],
  exports: [BankingService],
})
export class BankingModule {}
