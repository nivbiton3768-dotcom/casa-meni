import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, JobsOptions, Processor, ConnectionOptions } from 'bullmq';

export type JobName =
  | 'send-email'
  | 'plaid-sync-org'
  | 'generate-alerts'
  | 'channel-sync-property'
  | 'sign-pdf-stamp'
  | 'run-autopay-charges'
  | 'apply-late-fees';

export interface JobPayloads {
  'send-email': {
    to: string;
    subject: string;
    html: string;
    text: string;
  };
  'plaid-sync-org': { organizationId: string };
  'generate-alerts': { organizationId?: string };
  'channel-sync-property': { propertyId: string };
  'sign-pdf-stamp': { envelopeId: string };
  'run-autopay-charges': { date?: string };
  'apply-late-fees': Record<string, never>;
}

const QUEUE_NAME = 'casa-meni';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queue: Queue | null;
  private readonly workers: Worker[] = [];
  public readonly enabled: boolean;
  private readonly connection: ConnectionOptions | null;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    this.enabled = Boolean(redisUrl);

    if (this.enabled && redisUrl) {
      this.connection = {
        url: redisUrl,
        // BullMQ requires this for job retry / blocking commands.
        maxRetriesPerRequest: null,
      } as unknown as ConnectionOptions;

      this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
      this.queue.on('error', (err) => {
        this.logger.error(`Queue error: ${err.message}`);
      });
      this.logger.log('Queue ready (Redis-backed, async)');
    } else {
      this.queue = null;
      this.connection = null;
      this.logger.warn(
        'REDIS_URL not set — background jobs run synchronously inline. Set REDIS_URL to enable async queue + retries.',
      );
    }
  }

  /**
   * Enqueue a job. If Redis is not configured, the runner is invoked
   * synchronously so behaviour is identical from the caller's perspective.
   */
  async enqueue<K extends JobName>(
    name: K,
    payload: JobPayloads[K],
    opts?: JobsOptions,
    inlineRunner?: (payload: JobPayloads[K]) => Promise<void>,
  ): Promise<void> {
    if (this.queue) {
      await this.queue.add(name, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: { age: 7 * 86_400 },
        ...opts,
      });
      return;
    }
    if (inlineRunner) {
      try {
        await inlineRunner(payload);
      } catch (err) {
        this.logger.error(
          `Inline runner failed for ${name}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  /**
   * Register a worker for a single job name. Workers are managed centrally
   * so we can shut them down on module destroy.
   */
  registerWorker<K extends JobName>(
    name: K,
    handler: (payload: JobPayloads[K]) => Promise<void>,
  ): void {
    if (!this.connection) return; // No Redis — handlers invoked inline by enqueue()

    const processor: Processor = async (job) => {
      if (job.name !== name) return;
      await handler(job.data as JobPayloads[K]);
    };

    const worker = new Worker(QUEUE_NAME, processor, {
      connection: this.connection,
      concurrency: 4,
    });

    worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id ?? '?'} (${job?.name ?? '?'}) failed: ${err.message}`,
      );
    });
    worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} (${job.name}) completed`);
    });

    this.workers.push(worker);
    this.logger.log(`Worker registered for "${name}"`);
  }

  /**
   * Register a recurring (cron-style) job. Replaces the existing schedule.
   */
  async scheduleRecurring<K extends JobName>(
    name: K,
    payload: JobPayloads[K],
    repeat: { pattern: string },
  ): Promise<void> {
    if (!this.queue) return; // No-op without Redis
    await this.queue.add(name, payload, {
      jobId: `recurring-${name}`,
      repeat: { pattern: repeat.pattern },
      removeOnComplete: true,
    });
    this.logger.log(`Scheduled recurring job ${name} (${repeat.pattern})`);
  }

  async onModuleDestroy() {
    await Promise.allSettled(this.workers.map((w) => w.close()));
    if (this.queue) {
      await this.queue.close();
    }
  }
}
