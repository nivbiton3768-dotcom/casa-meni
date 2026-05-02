'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { AddInvestorForm } from '@/components/forms/add-investor-form';
import { AddEntityForm } from '@/components/forms/add-entity-form';
import { formatCents, cn } from '@/lib/utils';
import {
  Users,
  Plus,
  Building,
  DollarSign,
  PieChart,
  TrendingUp,
  Mail,
  Phone,
  Landmark,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface InvestorSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ownershipPct: string;
  entity: { id: string; name: string; type: string } | null;
  totalDistributedCents: number;
  _count: { distributions: number };
}

interface EntitySummary {
  id: string;
  name: string;
  type: string;
  propertyCount: number;
  investorCount: number;
  totalValueCents: number;
}

interface PortfolioSummary {
  investorCount: number;
  entityCount: number;
  totalOwnershipPct: number;
  totalDistributedCents: number;
  distributionCount: number;
  pnl: { totalIncomeCents: number; totalExpensesCents: number; netIncomeCents: number };
  entities: EntitySummary[];
}

export default function InvestorsPage() {
  const { data: investors, loading: loadingInvestors, refetch: refetchInvestors } = useApi<InvestorSummary[]>('/investors');
  const { data: portfolio, loading: loadingPortfolio, refetch: refetchPortfolio } = useApi<PortfolioSummary>('/investors/portfolio');
  const [showInvestor, setShowInvestor] = useState(false);
  const [showEntity, setShowEntity] = useState(false);

  const refetchAll = () => { refetchInvestors(); refetchPortfolio(); };
  const loading = loadingInvestors || loadingPortfolio;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investors & Entities"
        description={
          portfolio
            ? `${portfolio.investorCount} investors, ${portfolio.entityCount} entities`
            : 'Loading...'
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowEntity(true)} className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Add Entity
            </Button>
            <Button onClick={() => setShowInvestor(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Investor
            </Button>
          </>
        }
      />

      <Modal open={showInvestor} onClose={() => setShowInvestor(false)} title="Add Investor">
        <AddInvestorForm onSuccess={() => { setShowInvestor(false); refetchAll(); }} onCancel={() => setShowInvestor(false)} />
      </Modal>
      <Modal open={showEntity} onClose={() => setShowEntity(false)} title="Create Legal Entity">
        <AddEntityForm onSuccess={() => { setShowEntity(false); refetchAll(); }} onCancel={() => setShowEntity(false)} />
      </Modal>

      {/* Portfolio Stats */}
      {portfolio && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-50 p-2"><TrendingUp className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Net Income</p>
                <p className={cn('text-lg font-bold', portfolio.pnl.netIncomeCents >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCents(Math.abs(portfolio.pnl.netIncomeCents))}
                  {portfolio.pnl.netIncomeCents < 0 && ' loss'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-50 p-2"><DollarSign className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Distributed</p>
                <p className="text-lg font-bold text-gray-900">{formatCents(portfolio.totalDistributedCents)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-50 p-2"><PieChart className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Allocated Ownership</p>
                <p className="text-lg font-bold text-gray-900">{portfolio.totalOwnershipPct.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-50 p-2"><Building className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-lg font-bold text-gray-900">{formatCents(portfolio.pnl.totalIncomeCents)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Investors List */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Investors</h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><div className="h-16 animate-pulse rounded bg-gray-50" /></CardContent></Card>
              ))}
            </div>
          ) : !investors || investors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-purple-50 p-4"><Users className="h-8 w-8 text-purple-600" /></div>
                <h3 className="mt-3 font-semibold text-gray-900">No investors yet</h3>
                <p className="mt-1 text-sm text-gray-500">Add your first investor to track ownership and distributions.</p>
                <Button onClick={() => setShowInvestor(true)} className="mt-3 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Investor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {investors.map((inv) => (
                <Link key={inv.id} href={`/investors/${inv.id}`}>
                  <Card className="transition-shadow hover:shadow-md cursor-pointer">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold">
                            {inv.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-gray-900 break-words">{inv.name}</h3>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {Number(inv.ownershipPct).toFixed(1)}%
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                              <span className="flex min-w-0 items-center gap-1"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{inv.email}</span></span>
                              {inv.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{inv.phone}</span>}
                              {inv.entity && (
                                <span className="flex min-w-0 items-center gap-1"><Landmark className="h-3 w-3 shrink-0" /><span className="truncate">{inv.entity.name}</span></span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCents(inv.totalDistributedCents)}</p>
                            <p className="text-xs text-gray-500">{inv._count.distributions} distributions</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Entities Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Entities / LLCs</h2>
            <button onClick={() => setShowEntity(true)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {portfolio?.entities && portfolio.entities.length > 0 ? (
            <div className="space-y-3">
              {portfolio.entities.map((entity) => (
                <Card key={entity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-50 p-2"><Landmark className="h-4 w-4 text-indigo-600" /></div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{entity.name}</h4>
                        <p className="text-xs text-gray-500">{entity.type}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-gray-50 px-2 py-1.5">
                        <p className="text-xs text-gray-500">Properties</p>
                        <p className="text-sm font-semibold text-gray-900">{entity.propertyCount}</p>
                      </div>
                      <div className="rounded bg-gray-50 px-2 py-1.5">
                        <p className="text-xs text-gray-500">Investors</p>
                        <p className="text-sm font-semibold text-gray-900">{entity.investorCount}</p>
                      </div>
                      <div className="rounded bg-gray-50 px-2 py-1.5">
                        <p className="text-xs text-gray-500">Value</p>
                        <p className="text-sm font-semibold text-gray-900">{entity.totalValueCents >= 100000000 ? `$${(entity.totalValueCents / 100000000).toFixed(1)}M` : formatCents(entity.totalValueCents)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Landmark className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No entities yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
