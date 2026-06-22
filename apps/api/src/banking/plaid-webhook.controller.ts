import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { BankingService } from './banking.service';

interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: unknown;
}

/**
 * Public (unauthenticated) endpoint that receives Plaid webhooks.
 * Plaid calls this when transaction data becomes available or updates, so we
 * can sync without the user clicking "Sync now".
 *
 * No JWT guard here — Plaid cannot present a bearer token. We only ever sync
 * an item we already store, and the handler is idempotent, so an unknown
 * item_id is a no-op.
 */
@Controller('banking/plaid')
export class PlaidWebhookController {
  private readonly logger = new Logger(PlaidWebhookController.name);

  constructor(private readonly banking: BankingService) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(@Body() body: PlaidWebhookBody) {
    const type = body?.webhook_type;
    const code = body?.webhook_code;
    const itemId = body?.item_id;
    this.logger.log(`Plaid webhook: ${type}/${code} item=${itemId ?? '-'}`);

    if (type === 'TRANSACTIONS' && itemId) {
      const syncCodes = [
        'SYNC_UPDATES_AVAILABLE',
        'INITIAL_UPDATE',
        'HISTORICAL_UPDATE',
        'DEFAULT_UPDATE',
      ];
      if (code && syncCodes.includes(code)) {
        try {
          const r = await this.banking.syncByPlaidItem(itemId);
          this.logger.log(
            `Webhook sync for item ${itemId}: +${r.added} added, ${r.autoMatched} auto-matched`,
          );
        } catch (err) {
          this.logger.error(
            `Webhook sync failed for item ${itemId}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    return { received: true };
  }
}
