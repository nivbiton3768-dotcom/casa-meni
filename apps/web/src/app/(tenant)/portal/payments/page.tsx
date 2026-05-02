'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface Payment {
  id: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  method: string | null;
}

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function TenantPaymentsPage() {
  const { data: payments, loading } = useApi<Payment[]>('/tenant-portal/payments');

  if (loading) {
    return (
      <div className="space-y-3">
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500">
          Track your rent payments and upcoming due dates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 p-4">
                  <div>
                    <p className="font-semibold text-red-700">{fmt(p.amountCents)}</p>
                    <p className="text-sm text-red-500">
                      Due {new Date(p.dueDate).toLocaleDateString()} —{' '}
                      {Math.ceil((now.getTime() - new Date(p.dueDate).getTime()) / 86400000)} days overdue
                    </p>
                  </div>
                  <span className="rounded bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                    OVERDUE
                  </span>
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
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{fmt(p.amountCents)}</p>
                      <p className="text-sm text-gray-500">
                        Due {new Date(p.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded px-2.5 py-1 text-xs font-medium',
                        daysUntil <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {daysUntil <= 0 ? 'Today' : `${daysUntil} days`}
                    </span>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Paid On</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Status</th>
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
