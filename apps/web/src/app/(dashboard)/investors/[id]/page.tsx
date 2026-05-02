'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AddDistributionForm } from '@/components/forms/add-distribution-form';
import { formatCents, cn } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Landmark,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Plus,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';

interface Distribution {
  id: string;
  amountCents: number;
  date: string;
  notes: string | null;
}

interface InvestorDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ownershipPct: string;
  entity: {
    id: string;
    name: string;
    type: string;
    properties: { id: string; name: string; address: string }[];
  } | null;
  distributions: Distribution[];
  totalDistributedCents: number;
}

interface PropertyPnl {
  propertyId: string;
  propertyName: string;
  incomeCents: number;
  expensesCents: number;
  netCents: number;
}

interface InvestorPnl {
  investorName: string;
  ownershipPct: number;
  properties: PropertyPnl[];
  totalIncomeCents: number;
  totalExpensesCents: number;
  netIncomeCents: number;
  investorShareCents: number;
  totalDistributedCents: number;
}

interface InvestorMetrics {
  investorName: string;
  ownershipPct: number;
  investedCents: number;
  currentValueCents: number;
  totalDistributedCents: number;
  annualCashFlowCents: number;
  totalReturnCents: number;
  cashOnCashPct: number;
  equityMultiple: number;
  irrPct: number;
  holdingYears: number;
  propertyCount: number;
}

export default function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: investor, loading, refetch } = useApi<InvestorDetail>(`/investors/${id}`);
  const { data: pnl } = useApi<InvestorPnl>(`/investors/${id}/pnl`);
  const { data: metrics } = useApi<InvestorMetrics>(`/investors/${id}/metrics`);
  const [showDist, setShowDist] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse rounded bg-gray-50" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500">Investor not found.</p>
        <Link href="/investors" className="mt-2 text-sm text-blue-600 hover:underline">Back to Investors</Link>
      </div>
    );
  }

  const undistributed = pnl ? pnl.investorShareCents - pnl.totalDistributedCents : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3 md:items-center md:gap-4">
          <Link href="/investors" className="shrink-0 rounded-lg border p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl break-words">{investor.name}</h1>
              <span className="rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">
                {Number(investor.ownershipPct).toFixed(1)}% ownership
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span className="flex min-w-0 items-center gap-1"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{investor.email}</span></span>
              {investor.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 shrink-0" />{investor.phone}</span>}
              {investor.entity && <span className="flex min-w-0 items-center gap-1"><Landmark className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{investor.entity.name} ({investor.entity.type})</span></span>}
            </div>
          </div>
        </div>
        <Button onClick={() => setShowDist(true)} className="flex items-center gap-2 self-start md:self-auto">
          <Plus className="h-4 w-4" />
          Record Distribution
        </Button>
      </div>

      <Modal open={showDist} onClose={() => setShowDist(false)} title="Record Distribution">
        <AddDistributionForm investorId={id} investorName={investor.name} onSuccess={() => { setShowDist(false); refetch(); }} onCancel={() => setShowDist(false)} />
      </Modal>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><PieChart className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Ownership</p>
                <p className="text-lg font-bold text-gray-900">{Number(investor.ownershipPct).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', pnl && pnl.investorShareCents >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                {pnl && pnl.investorShareCents >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
              </div>
              <div>
                <p className="text-xs text-gray-500">Profit Share</p>
                <p className={cn('text-lg font-bold', pnl && pnl.investorShareCents >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {pnl ? formatCents(Math.abs(pnl.investorShareCents)) : '$0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2"><DollarSign className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Distributed</p>
                <p className="text-lg font-bold text-gray-900">{formatCents(investor.totalDistributedCents)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', undistributed > 0 ? 'bg-amber-50' : 'bg-gray-50')}>
                <DollarSign className={cn('h-5 w-5', undistributed > 0 ? 'text-amber-600' : 'text-gray-400')} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Undistributed</p>
                <p className={cn('text-lg font-bold', undistributed > 0 ? 'text-amber-600' : 'text-gray-900')}>
                  {formatCents(Math.max(0, undistributed))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Investment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Total Invested</p>
                <p className="text-lg font-bold text-blue-700">{formatCents(metrics.investedCents)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs text-emerald-600">Current Value</p>
                <p className="text-lg font-bold text-emerald-700">{formatCents(metrics.currentValueCents)}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="text-xs text-purple-600">Annual Cash Flow</p>
                <p className={cn('text-lg font-bold', metrics.annualCashFlowCents >= 0 ? 'text-purple-700' : 'text-red-600')}>
                  {formatCents(metrics.annualCashFlowCents)}
                </p>
              </div>
              <div className={cn('rounded-lg p-3', metrics.cashOnCashPct >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                <p className="text-xs text-gray-600">Cash-on-Cash</p>
                <p className={cn('text-lg font-bold', metrics.cashOnCashPct >= 0 ? 'text-green-700' : 'text-red-600')}>
                  {metrics.cashOnCashPct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-amber-600">Equity Multiple</p>
                <p className="text-lg font-bold text-amber-700">{metrics.equityMultiple.toFixed(2)}x</p>
              </div>
              <div className={cn('rounded-lg p-3', metrics.irrPct >= 0 ? 'bg-indigo-50' : 'bg-red-50')}>
                <p className="text-xs text-gray-600">IRR</p>
                <p className={cn('text-lg font-bold', metrics.irrPct >= 0 ? 'text-indigo-700' : 'text-red-600')}>
                  {metrics.irrPct.toFixed(1)}%
                </p>
                <p className="text-[10px] text-gray-400">{metrics.holdingYears}yr hold</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* P&L by Property */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                P&L Statement ({Number(investor.ownershipPct).toFixed(1)}% share)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pnl || pnl.properties.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No properties linked through entity. Assign properties to the investor&apos;s entity to see P&L.
                </p>
              ) : (
                <div className="space-y-3">
                  {pnl.properties.map((prop) => (
                    <div key={prop.propertyId} className="rounded-lg border border-gray-100 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/properties/${prop.propertyId}`} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">{prop.propertyName}</span>
                        </Link>
                        <span className={cn('text-sm font-bold', prop.netCents >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {prop.netCents >= 0 ? '+' : ''}{formatCents(prop.netCents)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <ArrowUpRight className="h-3 w-3" />
                          Income: {formatCents(prop.incomeCents)}
                        </span>
                        <span className="flex items-center gap-1 text-red-500">
                          <ArrowDownRight className="h-3 w-3" />
                          Expenses: {formatCents(prop.expensesCents)}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Revenue</span>
                      <span className="font-medium text-green-600">{formatCents(pnl.totalIncomeCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Total Expenses</span>
                      <span className="font-medium text-red-500">-{formatCents(pnl.totalExpensesCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 border-t pt-2">
                      <span className="text-gray-500">Net Income</span>
                      <span className={cn('font-bold', pnl.netIncomeCents >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatCents(pnl.netIncomeCents)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 bg-blue-50 rounded-lg px-3 py-2">
                      <span className="text-blue-700">Investor Share ({pnl.ownershipPct}%)</span>
                      <span className="font-bold text-blue-700">{formatCents(pnl.investorShareCents)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Distribution History */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Distribution History</CardTitle>
                <Button size="sm" onClick={() => setShowDist(true)} className="flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {investor.distributions.length === 0 ? (
                <div className="py-6 text-center">
                  <DollarSign className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No distributions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {investor.distributions.map((dist) => (
                    <div key={dist.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatCents(dist.amountCents)}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(dist.date).toLocaleDateString()}
                        </p>
                        {dist.notes && <p className="text-xs text-gray-400 mt-0.5">{dist.notes}</p>}
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total</span>
                      <span className="font-bold text-gray-900">{formatCents(investor.totalDistributedCents)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entity Properties */}
          {investor.entity && investor.entity.properties.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Entity Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {investor.entity.properties.map((prop) => (
                    <Link
                      key={prop.id}
                      href={`/properties/${prop.id}`}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{prop.name}</p>
                        <p className="text-xs text-gray-400">{prop.address}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
