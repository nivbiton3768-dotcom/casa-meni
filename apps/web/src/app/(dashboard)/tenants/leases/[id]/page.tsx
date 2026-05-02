'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCents, cn, apiFetch } from '@/lib/utils';
import {
  ArrowLeft,
  Home,
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  method: string | null;
}

interface LeaseDetail {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmountCents: number;
  depositCents: number;
  lateFeesCents: number;
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  unit: {
    unitNumber: string;
    bedrooms: number;
    bathrooms: string;
    property: {
      id: string;
      name: string;
      address: string;
    };
  };
  payments: Payment[];
  documents: { id: string; name: string; fileUrl: string }[];
}

export default function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: lease, loading, refetch } = useApi<LeaseDetail>(`/leases/${id}`);
  const { success, error: showError } = useToast();
  const [payingId, setPayingId] = useState<string | null>(null);

  const handleMarkPaid = async (paymentId: string) => {
    setPayingId(paymentId);
    try {
      await apiFetch(`/leases/payments/${paymentId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({ method: 'manual' }),
      });
      success('Payment recorded', 'Payment marked as paid.');
      refetch();
    } catch (err) {
      showError(
        'Failed',
        err instanceof Error ? err.message : 'Could not record payment',
      );
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500">Lease not found.</p>
        <Link href="/tenants" className="mt-2 text-sm text-blue-600 hover:underline">
          Back to Tenants
        </Link>
      </div>
    );
  }

  const now = new Date();
  const totalPayments = lease.payments.length;
  const paidPayments = lease.payments.filter((p) => p.paidAt).length;
  const overduePayments = lease.payments.filter(
    (p) => !p.paidAt && new Date(p.dueDate) < now,
  ).length;
  const totalCollected = lease.payments
    .filter((p) => p.paidAt)
    .reduce((sum, p) => sum + p.amountCents, 0);
  const totalExpected = lease.payments.reduce((sum, p) => sum + p.amountCents, 0);

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
    TERMINATED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 md:items-center md:gap-4">
        <Link
          href="/tenants"
          className="shrink-0 rounded-lg border p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
              Lease — {lease.unit.property.name}
            </h1>
            <span
              className={cn(
                'rounded-full px-3 py-0.5 text-xs font-medium',
                statusColors[lease.status] || 'bg-gray-100 text-gray-600',
              )}
            >
              {lease.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 break-words">
            Unit {lease.unit.unitNumber} — {lease.unit.property.address}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly Rent</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCents(lease.rentAmountCents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Payments Collected</p>
                <p className="text-lg font-bold text-gray-900">
                  {paidPayments}/{totalPayments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Collected</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCents(totalCollected)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-lg p-2',
                  overduePayments > 0 ? 'bg-red-50' : 'bg-gray-50',
                )}
              >
                <AlertCircle
                  className={cn(
                    'h-5 w-5',
                    overduePayments > 0 ? 'text-red-600' : 'text-gray-400',
                  )}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">Overdue</p>
                <p
                  className={cn(
                    'text-lg font-bold',
                    overduePayments > 0 ? 'text-red-600' : 'text-gray-900',
                  )}
                >
                  {overduePayments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Lease + Tenant info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                Lease Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Property</span>
                <Link
                  href={`/properties/${lease.unit.property.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {lease.unit.property.name}
                </Link>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Unit</span>
                <span className="font-medium text-gray-900">
                  {lease.unit.unitNumber} ({lease.unit.bedrooms}bd/
                  {lease.unit.bathrooms}ba)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Start</span>
                <span className="font-medium text-gray-900">
                  {new Date(lease.startDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">End</span>
                <span className="font-medium text-gray-900">
                  {new Date(lease.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deposit</span>
                <span className="font-medium text-gray-900">
                  {formatCents(lease.depositCents)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Late Fee</span>
                <span className="font-medium text-gray-900">
                  {formatCents(lease.lateFeesCents)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold">
                  {lease.tenant.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{lease.tenant.name}</p>
                  <p className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lease.tenant.email}</span>
                  </p>
                  {lease.tenant.phone && (
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="h-3 w-3 shrink-0" />
                      {lease.tenant.phone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collection progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Collection Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-500">
                  {formatCents(totalCollected)} of {formatCents(totalExpected)}
                </span>
                <span className="font-medium text-gray-900">
                  {totalExpected > 0
                    ? Math.round((totalCollected / totalExpected) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${
                      totalExpected > 0
                        ? Math.round((totalCollected / totalExpected) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Payment schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Payment Schedule ({totalPayments} payments)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lease.payments.map((payment) => {
                  const isPaid = !!payment.paidAt;
                  const isOverdue =
                    !isPaid && new Date(payment.dueDate) < now;

                  return (
                    <div
                      key={payment.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3 sm:px-4',
                        isPaid
                          ? 'border-green-100 bg-green-50/50'
                          : isOverdue
                            ? 'border-red-100 bg-red-50/50'
                            : 'border-gray-100',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {isPaid ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                        ) : isOverdue ? (
                          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 shrink-0 text-gray-300" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCents(payment.amountCents)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Due {new Date(payment.dueDate).toLocaleDateString()}
                            {isPaid && (
                              <span className="ml-2 text-green-600">
                                Paid{' '}
                                {new Date(payment.paidAt!).toLocaleDateString()}
                                {payment.method && ` via ${payment.method}`}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="ml-2 font-medium text-red-600">
                                Overdue
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {!isPaid && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(payment.id)}
                          disabled={payingId === payment.id}
                        >
                          {payingId === payment.id
                            ? 'Recording...'
                            : 'Mark Paid'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
