import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
  Products,
  Transaction as PlaidTransaction,
  RemovedTransaction,
} from 'plaid';

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly client: PlaidApi | null;
  public readonly enabled: boolean;
  private readonly webhookUrl: string | null;

  constructor(private readonly config: ConfigService) {
    const clientId = this.config.get<string>('PLAID_CLIENT_ID');
    const secret = this.config.get<string>('PLAID_SECRET');
    const env = (this.config.get<string>('PLAID_ENV') ?? 'sandbox').toLowerCase();
    this.enabled = Boolean(clientId && secret);

    // Public URL Plaid will POST transaction-update webhooks to. Must be
    // reachable from the internet (e.g. https://casameni-api.onrender.com/api/v1).
    const publicApiUrl = this.config
      .get<string>('PUBLIC_API_URL')
      ?.replace(/\/$/, '');
    this.webhookUrl = publicApiUrl
      ? `${publicApiUrl}/banking/plaid/webhook`
      : null;

    if (this.enabled) {
      const basePath =
        env === 'production'
          ? PlaidEnvironments.production
          : PlaidEnvironments.sandbox;
      const configuration = new Configuration({
        basePath,
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': clientId,
            'PLAID-SECRET': secret,
            'Plaid-Version': '2020-09-14',
          },
        },
      });
      this.client = new PlaidApi(configuration);
      this.logger.log(
        `Plaid service ready (env=${env}${this.webhookUrl ? `, webhook=${this.webhookUrl}` : ', no webhook'})`,
      );
    } else {
      this.client = null;
      this.logger.warn(
        'PLAID_CLIENT_ID/PLAID_SECRET not set — bank syncing is disabled',
      );
    }
  }

  /**
   * Create a link_token for the frontend Plaid Link flow.
   */
  async createLinkToken(args: {
    userId: string;
    organizationName: string;
  }): Promise<{ linkToken: string; expiration: string }> {
    if (!this.client) {
      throw new Error('Plaid is not configured');
    }
    try {
      const res = await this.client.linkTokenCreate({
        user: { client_user_id: args.userId },
        client_name: args.organizationName.slice(0, 30),
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
        ...(this.webhookUrl ? { webhook: this.webhookUrl } : {}),
      });
      return {
        linkToken: res.data.link_token,
        expiration: res.data.expiration,
      };
    } catch (err) {
      throw this.wrapPlaidError(err, 'createLinkToken');
    }
  }

  /**
   * Pull a Plaid axios error apart so the actual error_code / error_message
   * makes it into the server logs (and the response, if appropriate).
   */
  private wrapPlaidError(err: unknown, op: string): Error {
    type PlaidApiError = {
      response?: {
        status?: number;
        data?: {
          error_type?: string;
          error_code?: string;
          error_message?: string;
          display_message?: string;
          request_id?: string;
        };
      };
      message?: string;
    };
    const e = err as PlaidApiError;
    const data = e?.response?.data;
    const status = e?.response?.status;
    const summary = data
      ? `${data.error_type ?? '?'}/${data.error_code ?? '?'}: ${data.error_message ?? data.display_message ?? '(no message)'} (request_id=${data.request_id ?? '-'})`
      : (e?.message ?? String(err));
    this.logger.error(`Plaid ${op} failed [${status ?? '?'}]: ${summary}`);
    const msg = data?.error_message
      ? `Plaid ${op} failed: ${data.error_code} — ${data.error_message}`
      : `Plaid ${op} failed: ${summary}`;
    return new Error(msg);
  }

  /**
   * Exchange a public_token (from Plaid Link onSuccess) for an access_token.
   */
  async exchangePublicToken(publicToken: string): Promise<{
    accessToken: string;
    itemId: string;
  }> {
    if (!this.client) throw new Error('Plaid is not configured');
    try {
      const res = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      return {
        accessToken: res.data.access_token,
        itemId: res.data.item_id,
      };
    } catch (err) {
      throw this.wrapPlaidError(err, 'exchangePublicToken');
    }
  }

  /**
   * Fetch the metadata for accounts associated with an access_token.
   */
  async getAccounts(accessToken: string) {
    if (!this.client) throw new Error('Plaid is not configured');
    try {
      const res = await this.client.accountsGet({ access_token: accessToken });
      return res.data.accounts;
    } catch (err) {
      throw this.wrapPlaidError(err, 'getAccounts');
    }
  }

  /**
   * Pull incremental transactions using /transactions/sync. Returns added,
   * modified, removed transactions along with the cursor to use next time.
   */
  async syncTransactions(
    accessToken: string,
    cursor: string | null,
  ): Promise<{
    added: PlaidTransaction[];
    modified: PlaidTransaction[];
    removed: RemovedTransaction[];
    nextCursor: string;
    hasMore: boolean;
  }> {
    if (!this.client) throw new Error('Plaid is not configured');

    let added: PlaidTransaction[] = [];
    let modified: PlaidTransaction[] = [];
    let removed: RemovedTransaction[] = [];
    let nextCursor = cursor ?? '';
    let hasMore = true;
    let safetyCounter = 0;

    while (hasMore && safetyCounter < 25) {
      const res = await this.client.transactionsSync({
        access_token: accessToken,
        cursor: nextCursor || undefined,
      });
      added = added.concat(res.data.added);
      modified = modified.concat(res.data.modified);
      removed = removed.concat(res.data.removed);
      hasMore = res.data.has_more;
      nextCursor = res.data.next_cursor;
      safetyCounter += 1;
    }

    return { added, modified, removed, nextCursor, hasMore };
  }

  /** Whether a webhook URL is configured for this deployment. */
  get hasWebhook(): boolean {
    return Boolean(this.webhookUrl);
  }

  /**
   * Register/refresh the transaction webhook on an existing item. Items linked
   * before a webhook URL was configured won't push updates until this runs.
   */
  async updateItemWebhook(accessToken: string): Promise<boolean> {
    if (!this.client || !this.webhookUrl) return false;
    try {
      await this.client.itemWebhookUpdate({
        access_token: accessToken,
        webhook: this.webhookUrl,
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `Failed to update item webhook: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  /**
   * Disconnect a Plaid item (revokes the access token).
   */
  async removeItem(accessToken: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.itemRemove({ access_token: accessToken });
    } catch (err) {
      this.logger.warn(
        `Failed to remove Plaid item: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
