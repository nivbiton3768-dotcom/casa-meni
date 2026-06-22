import { Module } from '@nestjs/common';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { PlaidWebhookController } from './plaid-webhook.controller';
import { TransactionMatcherService } from './transaction-matcher.service';

@Module({
  controllers: [BankingController, PlaidWebhookController],
  providers: [BankingService, TransactionMatcherService],
  exports: [BankingService],
})
export class BankingModule {}
