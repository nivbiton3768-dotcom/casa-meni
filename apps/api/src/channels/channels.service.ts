import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import ical from 'ical-generator';
import * as nodeIcal from 'node-ical';
import { ChannelProvider, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import {
  CreateChannelFeedDto,
  UpdateChannelFeedDto,
} from './dto/channel-feed.dto';

interface ParsedEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  description?: string;
}

@Injectable()
export class ChannelsService implements OnModuleInit {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    this.queue.registerWorker('channel-sync-property', async (payload) => {
      try {
        await this.syncProperty(payload.propertyId);
      } catch (err) {
        this.logger.error(
          `channel-sync-property ${payload.propertyId} failed: ${err instanceof Error ? err.message : err}`,
        );
        throw err;
      }
    });
  }

  private generateExportToken(): string {
    return randomBytes(24).toString('hex');
  }

  private getApiBaseUrl(): string {
    const url =
      this.config.get<string>('API_PUBLIC_URL') ||
      this.config.get<string>('API_URL') ||
      'http://localhost:4000';
    return url.replace(/\/$/, '');
  }

  // ──────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────

  async createFeed(organizationId: string, dto: CreateChannelFeedDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId },
    });
    if (!property) throw new NotFoundException('Property not found');

    if (dto.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: { id: dto.unitId, propertyId: dto.propertyId },
      });
      if (!unit)
        throw new NotFoundException('Unit not found on this property');
    }

    const feed = await this.prisma.channelFeed.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        unitId: dto.unitId ?? null,
        provider: dto.provider,
        name: dto.name,
        importUrl: dto.importUrl,
        exportToken: this.generateExportToken(),
      },
    });

    // Trigger an initial sync
    await this.queue.enqueue(
      'channel-sync-property',
      { propertyId: dto.propertyId },
      {},
      async (p) => {
        await this.syncProperty(p.propertyId);
      },
    );

    return feed;
  }

  async listFeeds(organizationId: string) {
    const feeds = await this.prisma.channelFeed.findMany({
      where: { organizationId },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const base = this.getApiBaseUrl();
    return feeds.map((f) => ({
      ...f,
      exportUrl: `${base}/api/v1/channels/feeds/${f.exportToken}/export.ics`,
    }));
  }

  async updateFeed(
    organizationId: string,
    id: string,
    dto: UpdateChannelFeedDto,
  ) {
    const feed = await this.prisma.channelFeed.findFirst({
      where: { id, organizationId },
    });
    if (!feed) throw new NotFoundException('Channel feed not found');
    return this.prisma.channelFeed.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        importUrl: dto.importUrl ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  async deleteFeed(organizationId: string, id: string) {
    const feed = await this.prisma.channelFeed.findFirst({
      where: { id, organizationId },
    });
    if (!feed) throw new NotFoundException('Channel feed not found');
    // Detach reservations rather than cascading deletes (so we keep history).
    await this.prisma.reservation.updateMany({
      where: { channelFeedId: id },
      data: { channelFeedId: null },
    });
    await this.prisma.channelFeed.delete({ where: { id } });
    return { ok: true };
  }

  // ──────────────────────────────────────
  // Sync
  // ──────────────────────────────────────

  async syncOrganization(organizationId: string) {
    const properties = await this.prisma.property.findMany({
      where: {
        organizationId,
        channelFeeds: { some: { isActive: true } },
      },
      select: { id: true },
    });
    let total = { added: 0, updated: 0, conflicts: 0, errors: 0 };
    for (const p of properties) {
      try {
        const r = await this.syncProperty(p.id);
        total.added += r.added;
        total.updated += r.updated;
        total.conflicts += r.conflicts;
      } catch (err) {
        total.errors += 1;
        this.logger.error(
          `Sync failed for property ${p.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return total;
  }

  async enqueueSyncOrganization(organizationId: string) {
    const properties = await this.prisma.property.findMany({
      where: {
        organizationId,
        channelFeeds: { some: { isActive: true } },
      },
      select: { id: true },
    });
    for (const p of properties) {
      await this.queue.enqueue(
        'channel-sync-property',
        { propertyId: p.id },
        {},
        async (payload) => {
          await this.syncProperty(payload.propertyId);
        },
      );
    }
    return { queued: properties.length };
  }

  async syncProperty(propertyId: string) {
    const feeds = await this.prisma.channelFeed.findMany({
      where: { propertyId, isActive: true },
    });

    const stats = { added: 0, updated: 0, conflicts: 0 };

    for (const feed of feeds) {
      try {
        const events = await this.fetchEvents(feed.importUrl);
        const result = await this.applyEvents(feed, events);
        stats.added += result.added;
        stats.updated += result.updated;
        stats.conflicts += result.conflicts;

        await this.prisma.channelFeed.update({
          where: { id: feed.id },
          data: { lastSyncedAt: new Date(), lastSyncError: null },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.prisma.channelFeed.update({
          where: { id: feed.id },
          data: { lastSyncedAt: new Date(), lastSyncError: message },
        });
        this.logger.error(`Feed ${feed.id} sync failed: ${message}`);
      }
    }

    return stats;
  }

  private async fetchEvents(url: string): Promise<ParsedEvent[]> {
    const data = await nodeIcal.async.fromURL(url);
    const events: ParsedEvent[] = [];
    for (const key of Object.keys(data)) {
      const item = data[key] as nodeIcal.VEvent;
      if (item.type !== 'VEVENT') continue;
      // Some channels publish all-day events; node-ical gives Date-typed values.
      if (!item.start || !item.end || !item.uid) continue;
      events.push({
        uid: String(item.uid),
        summary: String(item.summary ?? 'Reserved'),
        description: typeof item.description === 'string' ? item.description : undefined,
        start: new Date(item.start),
        end: new Date(item.end),
      });
    }
    return events;
  }

  private parseGuestNameFromIcal(summary: string, description?: string): string {
    // Airbnb summary: "Reserved (HMABC123)" or "Reserved" — guest name in description
    // VRBO: typically "Reserved - GuestName"
    // Booking: "CLOSED - Not available" sometimes; or guest summary
    const cleaned = (summary || '').trim();

    // Try to pull "Last name" from description (Airbnb format: "Last name: X")
    if (description) {
      const m = description.match(/Last name:?\s*([A-Za-z][A-Za-z'\- ]{0,50})/i);
      if (m) return `Guest (${m[1].trim()})`;
    }

    if (/^reserved/i.test(cleaned)) return cleaned;
    if (/^closed/i.test(cleaned)) return 'Blocked (channel)';
    if (/^not available/i.test(cleaned)) return 'Blocked (channel)';
    return cleaned || 'Guest';
  }

  private async applyEvents(
    feed: { id: string; organizationId: string; propertyId: string; unitId: string | null; provider: ChannelProvider },
    events: ParsedEvent[],
  ): Promise<{ added: number; updated: number; conflicts: number }> {
    let added = 0;
    let updated = 0;
    let conflicts = 0;

    for (const ev of events) {
      const guestName = this.parseGuestNameFromIcal(ev.summary, ev.description);
      const isBlock = /blocked|not available|closed/i.test(guestName);
      const channelLabel = feed.provider.toLowerCase();

      // Detect conflicts: any other reservation overlaps these dates on this unit
      const overlapping = await this.prisma.reservation.findMany({
        where: {
          propertyId: feed.propertyId,
          unitId: feed.unitId ?? undefined,
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
          channelFeedId: { not: feed.id },
          checkIn: { lt: ev.end },
          checkOut: { gt: ev.start },
        },
        take: 1,
      });
      if (overlapping.length > 0) {
        conflicts += 1;
      }

      const data = {
        organizationId: feed.organizationId,
        propertyId: feed.propertyId,
        unitId: feed.unitId,
        guestName: isBlock ? 'Blocked' : guestName,
        guestEmail: '',
        channel: channelLabel,
        externalId: ev.uid,
        channelFeedId: feed.id,
        status: isBlock
          ? ReservationStatus.CANCELLED
          : ReservationStatus.CONFIRMED,
        checkIn: ev.start,
        checkOut: ev.end,
        nightlyRateCents: 0,
        totalCents: 0,
        notes: ev.description ?? null,
      };

      const upserted = await this.prisma.reservation.upsert({
        where: {
          channelFeedId_externalId: {
            channelFeedId: feed.id,
            externalId: ev.uid,
          },
        },
        create: data,
        update: {
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guestName: data.guestName,
          status: data.status,
          notes: data.notes,
        },
      });

      // Use createdAt vs updatedAt to detect added vs updated
      if (
        upserted.createdAt.getTime() === upserted.updatedAt.getTime() ||
        Math.abs(upserted.createdAt.getTime() - upserted.updatedAt.getTime()) < 1000
      ) {
        added += 1;
      } else {
        updated += 1;
      }
    }

    return { added, updated, conflicts };
  }

  // ──────────────────────────────────────
  // Export iCal feed (for syncing OUR availability INTO Airbnb/VRBO/Booking)
  // ──────────────────────────────────────

  async generateIcs(token: string): Promise<string> {
    const feed = await this.prisma.channelFeed.findUnique({
      where: { exportToken: token },
      include: {
        property: true,
        unit: true,
      },
    });
    if (!feed) throw new NotFoundException('Calendar feed not found');

    // Pull all reservations on this unit/property that should block availability,
    // including reservations from OTHER channels (so we cross-block).
    const reservations = await this.prisma.reservation.findMany({
      where: {
        propertyId: feed.propertyId,
        ...(feed.unitId ? { unitId: feed.unitId } : {}),
        status: {
          in: [
            ReservationStatus.CONFIRMED,
            ReservationStatus.CHECKED_IN,
            ReservationStatus.CHECKED_OUT,
          ],
        },
        // Exclude self-channel events to avoid loops (the channel already knows
        // about its own bookings; we feed it everything else as blocks).
        channelFeedId: { not: feed.id },
      },
      orderBy: { checkIn: 'asc' },
    });

    const calName = `Casa Meni — ${feed.property.name}${feed.unit ? ` Unit ${feed.unit.unitNumber}` : ''}`;
    const cal = ical({
      name: calName,
      prodId: { company: 'Casa Meni', product: 'Channel Manager' },
      timezone: 'UTC',
    });

    for (const r of reservations) {
      cal.createEvent({
        id: r.id,
        start: r.checkIn,
        end: r.checkOut,
        summary: 'Reserved',
        description: `Source: ${r.channel ?? 'direct'}`,
        allDay: false,
      });
    }

    return cal.toString();
  }
}
