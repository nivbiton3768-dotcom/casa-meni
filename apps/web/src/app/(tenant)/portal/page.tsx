'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Calendar,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';

interface Payment {
  id: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  method: string | null;
}

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  property: { name: string };
  unit: { unitNumber: string } | null;
}

interface Dashboard {
  lease: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    rentAmountCents: number;
    depositCents: number;
    property: { name: string; address: string };
    unit: { unitNumber: string };
  } | null;
  payments: {
    upcoming: Payment[];
    overdue: Payment[];
    history: Payment[];
  };
  workOrders: WorkOrder[];
  summary: {
    totalPaid: number;
    totalDue: number;
    overdueCount: number;
    overdueAmount: number;
    nextPaymentDate: string | null;
    nextPaymentAmount: number;
    daysUntilLeaseEnd: number;
    openWorkOrders: number;
  } | null;
}

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  WAITING_PARTS: 'bg-orange-100 text-orange-700',
};

export default function TenantDashboard() {
  const { data, loading } = useApi<Dashboard>('/tenant-portal/dashboard');

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-gray-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.lease) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="rounded-full bg-gray-100 p-6">
          <Calendar className="h-12 w-12 text-gray-400" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          No Active Lease
        </h2>
        <p className="mt-2 text-gray-500">
          You don&apos;t have an active lease yet. Contact your property manager.
        </p>
      </div>
    );
  }

  const s = data.summary!;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="My Home"
        description={`${data.lease.property.name} — Unit ${data.lease.unit.unitNumber}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Rent</p>
                <p className="text-xl font-bold text-gray-900">
                  {fmt(data.lease.rentAmountCents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(s.overdueCount > 0 && 'border-red-200 bg-red-50/30')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2.5', s.overdueCount > 0 ? 'bg-red-100' : 'bg-gray-50')}>
                <AlertTriangle className={cn('h-5 w-5', s.overdueCount > 0 ? 'text-red-600' : 'text-gray-400')} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Overdue</p>
                <p className={cn('text-xl font-bold', s.overdueCount > 0 ? 'text-red-600' : 'text-gray-900')}>
                  {s.overdueCount > 0 ? fmt(s.overdueAmount) : 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Payment</p>
                <p className="text-xl font-bold text-gray-900">
                  {s.nextPaymentDate
                    ? new Date(s.nextPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Open Requests</p>
                <p className="text-xl font-bold text-gray-900">
                  {s.openWorkOrders}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lease Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="min-w-0 truncate">Lease Details</CardTitle>
            <Link href="/portal/lease" className="shrink-0">
              <Button variant="ghost" className="text-sm">
                View Full <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 text-gray-500">Property</span>
              <span className="min-w-0 break-words text-right font-medium">{data.lease.property.name}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 text-gray-500">Address</span>
              <span className="min-w-0 max-w-[65%] break-words text-right font-medium">{data.lease.property.address}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 text-gray-500">Unit</span>
              <span className="font-medium">{data.lease.unit.unitNumber}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 text-gray-500">Lease Period</span>
              <span className="min-w-0 break-words text-right font-medium">
                {new Date(data.lease.startDate).toLocaleDateString()} —{' '}
                {new Date(data.lease.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 text-gray-500">Lease Ends In</span>
              <span className={cn('font-medium', s.daysUntilLeaseEnd <= 30 ? 'text-red-600' : 'text-gray-900')}>
                {s.daysUntilLeaseEnd} days
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="shrink-0 text-gray-500">Deposit</span>
              <span className="font-medium">{fmt(data.lease.depositCents)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="min-w-0 truncate">Upcoming Payments</CardTitle>
            <Link href="/portal/payments" className="shrink-0">
              <Button variant="ghost" className="text-sm">
                <span className="hidden sm:inline">All Payments</span>
                <span className="sm:hidden">All</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.payments.overdue.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">
                  {data.payments.overdue.length} overdue payment{data.payments.overdue.length > 1 ? 's' : ''} totaling {fmt(s.overdueAmount)}
                </p>
              </div>
            )}
            <div className="space-y-3">
              {[...data.payments.overdue, ...data.payments.upcoming].slice(0, 5).map((p) => {
                const isOverdue = !p.paidAt && new Date(p.dueDate) < new Date();
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium', isOverdue ? 'text-red-600' : 'text-gray-900')}>
                        {fmt(p.amountCents)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due {new Date(p.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    {isOverdue ? (
                      <span className="shrink-0 whitespace-nowrap rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Overdue
                      </span>
                    ) : (
                      <span className="shrink-0 whitespace-nowrap rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Upcoming
                      </span>
                    )}
                  </div>
                );
              })}
              {data.payments.overdue.length === 0 && data.payments.upcoming.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  All caught up! No upcoming payments.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="min-w-0 truncate">Recent Maintenance Requests</CardTitle>
          <Link href="/portal/maintenance" className="shrink-0">
            <Button variant="ghost" className="text-sm">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.workOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No maintenance requests yet.</p>
          ) : (
            <div className="space-y-3">
              {data.workOrders.map((wo) => (
                <Link
                  key={wo.id}
                  href={`/portal/maintenance/${wo.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{wo.title}</p>
                    <p className="truncate text-xs text-gray-500">
                      {new Date(wo.createdAt).toLocaleDateString()} · {wo.property.name}
                      {wo.unit ? ` Unit ${wo.unit.unitNumber}` : ''}
                    </p>
                  </div>
                  <span className={cn('shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium', statusColors[wo.status] || 'bg-gray-100 text-gray-700')}>
                    {wo.status.replace(/_/g, ' ')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
