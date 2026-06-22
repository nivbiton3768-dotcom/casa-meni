import {
  Controller,
  Get,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    // Intentionally does NOT touch the DB so uptime pingers get a fast,
    // always-available response and reliably keep the instance warm.
    return { status: 'ok', ts: new Date().toISOString() };
  }
}

/**
 * Render's free web service spins down after ~15 minutes of no inbound HTTP
 * traffic, which makes the next request (e.g. login) take 30–60s to cold-start.
 *
 * This service pings the app's own public URL on an interval, which registers
 * as inbound traffic and resets Render's idle timer so the instance stays warm.
 * It also runs a trivial query to keep the Neon database from suspending.
 *
 * Only runs when a public URL is known (RENDER_EXTERNAL_URL is injected by
 * Render automatically; PUBLIC_API_URL is a manual fallback).
 */
@Injectable()
export class KeepWarmService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepWarmService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 10 * 60 * 1000; // 10m < Render's 15m idle window

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const external =
      this.config.get<string>('RENDER_EXTERNAL_URL') ??
      this.config.get<string>('PUBLIC_API_URL');

    if (!external) {
      this.logger.warn(
        'No RENDER_EXTERNAL_URL/PUBLIC_API_URL — keep-warm self-ping disabled.',
      );
      return;
    }

    // PUBLIC_API_URL may already include the /api/v1 prefix; strip it so we
    // build a clean health URL either way.
    const base = external.replace(/\/$/, '').replace(/\/api\/v1$/, '');
    const url = `${base}/api/v1/health`;

    this.timer = setInterval(() => {
      void this.ping(url);
    }, this.intervalMs);
    this.timer.unref?.();

    this.logger.log(`Keep-warm enabled — pinging ${url} every 10m`);
  }

  private async ping(url: string) {
    try {
      await fetch(url, { method: 'GET' });
    } catch (err) {
      this.logger.warn(
        `Keep-warm ping failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    try {
      // Keep Neon from suspending so warm login stays fast too.
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // DB transient errors are non-fatal for keep-warm.
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

@Module({
  controllers: [HealthController],
  providers: [KeepWarmService],
})
export class HealthModule {}
