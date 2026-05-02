import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getChecklist(organizationId: string): Promise<{
    items: ChecklistItem[];
    completed: number;
    total: number;
    percent: number;
  }> {
    const [
      propertyCount,
      unitCount,
      tenantCount,
      leaseCount,
      paymentCount,
      bankAccountCount,
      channelCount,
      docCount,
    ] = await Promise.all([
      this.prisma.property.count({ where: { organizationId } }),
      this.prisma.unit.count({
        where: { property: { organizationId } },
      }),
      this.prisma.user.count({
        where: { organizationId, role: 'TENANT' },
      }),
      this.prisma.lease.count({ where: { organizationId } }),
      this.prisma.payment.count({
        where: { lease: { organizationId } },
      }),
      this.prisma.bankAccount.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.channelFeed.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.document.count({ where: { organizationId } }),
    ]);

    const stripeEnabled = Boolean(this.config.get<string>('STRIPE_SECRET_KEY'));
    const plaidEnabled = Boolean(this.config.get<string>('PLAID_CLIENT_ID'));

    const items: ChecklistItem[] = [
      {
        id: 'add-property',
        title: 'Add your first property',
        description: 'Properties are the foundation — add at least one to unlock most features.',
        done: propertyCount > 0,
        href: '/properties',
        cta: 'Add property',
      },
      {
        id: 'add-unit',
        title: 'Add a unit',
        description: 'Even single-family rentals need one unit row to track rent and tenants.',
        done: unitCount > 0,
        href: '/properties',
        cta: 'Add unit',
      },
      {
        id: 'add-tenant',
        title: 'Invite your first tenant',
        description: 'Create a lease, send portal access, and start collecting rent online.',
        done: tenantCount > 0 || leaseCount > 0,
        href: '/tenants',
        cta: 'Add tenant',
      },
      {
        id: 'connect-bank',
        title: plaidEnabled
          ? 'Connect a bank or wallet'
          : 'Add a manual account (Venmo, Cash App, etc.)',
        description: plaidEnabled
          ? 'Auto-match incoming rent payments — no more manual marking.'
          : 'Track every account you receive rent through, even if it’s an in-app balance.',
        done: bankAccountCount > 0,
        href: '/banking',
        cta: 'Connect',
      },
      {
        id: 'enable-online-pay',
        title: 'Enable online rent payments',
        description: stripeEnabled
          ? 'Stripe is configured — tenants can pay via card or ACH.'
          : 'Set STRIPE_SECRET_KEY in your environment to accept online payments.',
        done: stripeEnabled,
        href: '/settings',
        cta: stripeEnabled ? 'Configured' : 'Set up Stripe',
      },
      {
        id: 'first-payment',
        title: 'Record your first rent payment',
        description: 'Either via the tenant portal or by matching an incoming bank deposit.',
        done: paymentCount > 0,
        href: '/transactions',
        cta: 'View payments',
      },
      {
        id: 'connect-channel',
        title: 'Sync a short-term rental channel',
        description: 'Connect Airbnb, VRBO, or Booking.com via iCal so reservations sync automatically.',
        done: channelCount > 0,
        href: '/channels',
        cta: 'Connect channel',
      },
      {
        id: 'upload-doc',
        title: 'Upload a lease or document',
        description: 'Build a paperless vault — leases, insurance, deeds, inspection reports.',
        done: docCount > 0,
        href: '/documents',
        cta: 'Upload',
      },
    ];

    const completed = items.filter((i) => i.done).length;
    return {
      items,
      completed,
      total: items.length,
      percent: Math.round((completed / items.length) * 100),
    };
  }
}
