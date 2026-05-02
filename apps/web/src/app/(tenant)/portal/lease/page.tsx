'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FileText, Building2, Calendar, DollarSign, Shield } from 'lucide-react';

interface LeaseDetail {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmountCents: number;
  depositCents: number;
  lateFeesCents: number;
  unit: {
    unitNumber: string;
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
    property: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  payments: {
    id: string;
    amountCents: number;
    dueDate: string;
    paidAt: string | null;
    method: string | null;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    url: string;
    sizeBytes: number;
  }[];
}

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function TenantLeasePage() {
  const { data: lease, loading } = useApi<LeaseDetail>('/tenant-portal/lease');

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse rounded bg-gray-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex flex-col items-center py-20">
        <FileText className="h-12 w-12 text-gray-300" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">No Active Lease</h2>
        <p className="text-gray-500">Contact your property manager for details.</p>
      </div>
    );
  }

  const now = new Date();
  const end = new Date(lease.endDate);
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalMonths = lease.payments.length;
  const paidCount = lease.payments.filter((p) => p.paidAt).length;
  const totalPaid = lease.payments
    .filter((p) => p.paidAt)
    .reduce((s, p) => s + p.amountCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Lease</h1>
        <p className="text-sm text-gray-500">
          {lease.unit.property.name} — Unit {lease.unit.unitNumber}
        </p>
      </div>

      {/* Lease Status Banner */}
      <div
        className={cn(
          'rounded-xl border p-4',
          daysLeft <= 30
            ? 'border-red-200 bg-red-50'
            : daysLeft <= 90
              ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50',
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Lease Status</p>
            <p className="text-lg font-bold text-gray-900">{lease.status}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">Ends In</p>
            <p
              className={cn(
                'text-lg font-bold',
                daysLeft <= 30 ? 'text-red-600' : daysLeft <= 90 ? 'text-amber-600' : 'text-emerald-600',
              )}
            >
              {daysLeft} days
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/60">
          <div
            className={cn(
              'h-full rounded-full',
              daysLeft <= 30 ? 'bg-red-500' : daysLeft <= 90 ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{
              width: `${Math.min(100, (paidCount / totalMonths) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {paidCount} of {totalMonths} payments completed
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Property</span>
              <span className="font-medium">{lease.unit.property.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Address</span>
              <span className="text-right font-medium">
                {lease.unit.property.address}, {lease.unit.property.city},{' '}
                {lease.unit.property.state} {lease.unit.property.zip}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Unit</span>
              <span className="font-medium">{lease.unit.unitNumber}</span>
            </div>
            {lease.unit.bedrooms && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bedrooms / Bathrooms</span>
                <span className="font-medium">
                  {lease.unit.bedrooms} bd / {lease.unit.bathrooms || 0} ba
                </span>
              </div>
            )}
            {lease.unit.sqft && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Square Feet</span>
                <span className="font-medium">{lease.unit.sqft.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Start Date</span>
              <span className="font-medium">{new Date(lease.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">End Date</span>
              <span className="font-medium">{new Date(lease.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Monthly Rent</span>
              <span className="text-lg font-bold text-gray-900">{fmt(lease.rentAmountCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Security Deposit</span>
              <span className="font-medium">{fmt(lease.depositCents)}</span>
            </div>
            {lease.lateFeesCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Late Fee</span>
                <span className="font-medium text-red-600">{fmt(lease.lateFeesCents)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Total Lease Value</p>
              <p className="text-lg font-bold text-gray-900">
                {fmt(lease.payments.reduce((s, p) => s + p.amountCents, 0))}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-lg font-bold text-green-600">{fmt(totalPaid)}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-lg font-bold text-amber-600">
                {fmt(lease.payments.filter((p) => !p.paidAt).reduce((s, p) => s + p.amountCents, 0))}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs text-gray-500">Payments Made</p>
              <p className="text-lg font-bold text-blue-600">
                {paidCount} / {totalMonths}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      {lease.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-400" />
              Lease Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lease.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {(doc.sizeBytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600">Download</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
