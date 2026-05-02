'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface Payment {
  id: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  method: string | null;
  status?: string;
  stripeReceiptUrl?: string | null;
}

interface PaymentSettings {
  enabled: boolean;
  publishableKey: string | null;
}

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function PayButton({
  payment,
  onSuccess,
}: {
  payment: Payment;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ url: string }>(
        `/payments/${payment.id}/checkout`,
        { method: 'POST' },
      );
      window.location.href = res.url;
      onSuccess();
    } catch (err) {
      toast.error(
        'Could not start payment',
        err instanceof Error ? err.message : 'Try again',
      );
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          Pay {fmt(payment.amountCents)}
        </>
      )}
    </button>
  );
}

export default function TenantPaymentsPage() {
  const { data: payments, loading, refetch } =
    useApi<Payment[]>('/tenant-portal/payments');
  const { data: settings } = useApi<PaymentSettings>('/payments/settings');

  if (loading) {
    return (
      <div className="space-y-3 pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-12 animate-pulse rounded bg-gray-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const now = new Date();
  const overdue = payments?.filter((p) => !p.paidAt && new Date(p.dueDate) < now) || [];
  const upcoming = payments?.filter((p) => !p.paidAt && new Date(p.dueDate) >= now) || [];
  const paid = payments?.filter((p) => p.paidAt) || [];

  const totalPaid = paid.reduce((s, p) => s + p.amountCents, 0);
  const totalOverdue = overdue.reduce((s, p) => s + p.amountCents, 0);
  const totalUpcoming = upcoming.reduce((s, p) => s + p.amountCents, 0);

  const onlinePaymentsEnabled = settings?.enabled ?? false;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="Payment History"
        description="Track your rent payments and upcoming due dates"
      />

      {!onlinePaymentsEnabled && (overdue.length > 0 || upcoming.length > 0) && (
        <Card className="border-blue-100 bg-blue-50/40">
          <CardContent className="p-4 text-sm text-blue-900">
            Online payments aren&apos;t set up yet. Please contact your property
            manager for payment options.
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className={cn(overdue.length > 0 && 'border-red-200')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={cn('rounded-lg p-2.5', overdue.length > 0 ? 'bg-red-100' : 'bg-gray-50')}>
              <AlertTriangle className={cn('h-6 w-6', overdue.length > 0 ? 'text-red-600' : 'text-gray-400')} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className={cn('text-2xl font-bold', overdue.length > 0 ? 'text-red-600' : 'text-gray-900')}>
                {overdue.length > 0 ? fmt(totalOverdue) : 'None'}
              </p>
              {overdue.length > 0 && (
                <p className="text-xs text-red-500">{overdue.length} payment{overdue.length > 1 ? 's' : ''}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalUpcoming)}</p>
              <p className="text-xs text-gray-400">{upcoming.length} payment{upcoming.length !== 1 ? 's' : ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-green-50 p-2.5">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p>
              <p className="text-xs text-gray-400">{paid.length} payment{paid.length !== 1 ? 's' : ''}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Overdue Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-red-700">{fmt(p.amountCents)}</p>
                    <p className="text-sm text-red-500">
                      Due {new Date(p.dueDate).toLocaleDateString()} —{' '}
                      {Math.ceil((now.getTime() - new Date(p.dueDate).getTime()) / 86400000)} days overdue
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="shrink-0 whitespace-nowrap rounded bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                      OVERDUE
                    </span>
                    {onlinePaymentsEnabled && (
                      <PayButton payment={p} onSuccess={refetch} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcoming.map((p) => {
                const daysUntil = Math.ceil(
                  (new Date(p.dueDate).getTime() - now.getTime()) / 86400000,
                );
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{fmt(p.amountCents)}</p>
                      <p className="text-sm text-gray-500">
                        Due {new Date(p.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span
                        className={cn(
                          'shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium',
                          daysUntil <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {daysUntil <= 0 ? 'Today' : `${daysUntil} days`}
                      </span>
                      {onlinePaymentsEnabled && daysUntil <= 14 && (
                        <PayButton payment={p} onSuccess={refetch} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {paid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: card list */}
            <div className="space-y-2 md:hidden">
              {paid.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{fmt(p.amountCents)}</p>
                    <p className="text-xs text-gray-500">
                      Due {new Date(p.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Paid {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                      {p.method ? ` · ${p.method}` : ''}
                    </p>
                    {p.stripeReceiptUrl && (
                      <a
                        href={p.stripeReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 text-xs font-medium text-blue-600 hover:underline"
                      >
                        View receipt
                      </a>
                    )}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Paid
                  </span>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Paid On</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {paid.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 text-gray-900">
                        {new Date(p.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-medium text-gray-900">{fmt(p.amountCents)}</td>
                      <td className="py-3 text-gray-600">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 text-gray-600 capitalize">{p.method || '—'}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      </td>
                      <td className="py-3">
                        {p.stripeReceiptUrl ? (
                          <a
                            href={p.stripeReceiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
