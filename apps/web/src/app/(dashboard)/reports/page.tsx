'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTable, ResponsiveColumn } from '@/components/ui/responsive-table';
import { formatCents, cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Home,
  DollarSign,
  Hammer,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface MonthlyPnl {
  month: string;
  incomeCents: number;
  expensesCents: number;
  netCents: number;
}

interface OccupancyData {
  overall: { totalUnits: number; occupiedUnits: number; occupancyPct: number };
  byProperty: {
    propertyId: string;
    propertyName: string;
    type: string;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyPct: number;
  }[];
}

interface RentCollectionData {
  overall: {
    totalDue: number;
    totalCollected: number;
    totalOverdue: number;
    collectionPct: number;
  };
  monthly: {
    month: string;
    due: number;
    collected: number;
    dueCents: number;
    collectedCents: number;
    collectionPct: number;
  }[];
}

interface RenovationBurn {
  id: string;
  name: string;
  propertyName: string;
  status: string;
  budgetCents: number;
  actualCostCents: number;
  budgetUsedPct: number;
  burnData: { month: string; spentCents: number; cumulativeCents: number }[];
}

interface InvestorReturn {
  id: string;
  name: string;
  ownershipPct: number;
  profitShareCents: number;
  totalDistributedCents: number;
  undistributedCents: number;
  propertyCount: number;
}

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
};

const toDollars = (cents: number) => cents / 100;

const dollarFormatter = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any) => dollarFormatter(Number(value));

export default function ReportsPage() {
  const { data: pnl, loading: loadingPnl } = useApi<MonthlyPnl[]>('/reports/monthly-pnl');
  const { data: occupancy, loading: loadingOcc } = useApi<OccupancyData>('/reports/occupancy');
  const { data: collection, loading: loadingColl } = useApi<RentCollectionData>('/reports/rent-collection');
  const { data: renovations, loading: loadingReno } = useApi<RenovationBurn[]>('/reports/renovation-burn');
  const { data: returns, loading: loadingRet } = useApi<InvestorReturn[]>('/reports/investor-returns');

  const pnlChart = pnl?.map((m) => ({
    month: formatMonth(m.month),
    Income: toDollars(m.incomeCents),
    Expenses: toDollars(m.expensesCents),
    Net: toDollars(m.netCents),
  })) || [];

  const collectionChart = collection?.monthly.map((m) => ({
    month: formatMonth(m.month),
    Due: toDollars(m.dueCents),
    Collected: toDollars(m.collectedCents),
    Rate: m.collectionPct,
  })) || [];

  const occupancyColors = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

  const returnsColumns: ResponsiveColumn<InvestorReturn>[] = [
    {
      key: 'name',
      header: 'Investor',
      primary: true,
      cell: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
    },
    {
      key: 'ownership',
      header: <span className="block text-right">Ownership</span>,
      mobileLabel: 'Ownership',
      cell: (r) => (
        <span className="block text-right text-gray-700">{r.ownershipPct.toFixed(1)}%</span>
      ),
    },
    {
      key: 'profitShare',
      header: <span className="block text-right">Profit Share</span>,
      mobileLabel: 'Profit Share',
      cell: (r) => (
        <span
          className={cn(
            'block text-right font-medium',
            r.profitShareCents >= 0 ? 'text-green-600' : 'text-red-600',
          )}
        >
          {formatCents(r.profitShareCents)}
        </span>
      ),
    },
    {
      key: 'distributed',
      header: <span className="block text-right">Distributed</span>,
      mobileLabel: 'Distributed',
      cell: (r) => (
        <span className="block text-right text-gray-700">{formatCents(r.totalDistributedCents)}</span>
      ),
    },
    {
      key: 'undistributed',
      header: <span className="block text-right">Undistributed</span>,
      mobileLabel: 'Undistributed',
      cell: (r) => (
        <span
          className={cn(
            'block text-right font-medium',
            r.undistributedCents > 0 ? 'text-amber-600' : 'text-gray-500',
          )}
        >
          {formatCents(r.undistributedCents)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">Financial performance, occupancy, and portfolio insights</p>
      </div>

      {/* Section 1: Monthly P&L */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Monthly P&L (12 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPnl ? (
            <div className="h-72 animate-pulse rounded bg-gray-50" />
          ) : pnlChart.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No transaction data yet.</p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {(() => {
                  const totals = pnl!.reduce(
                    (acc, m) => ({
                      income: acc.income + m.incomeCents,
                      expenses: acc.expenses + m.expensesCents,
                      net: acc.net + m.netCents,
                    }),
                    { income: 0, expenses: 0, net: 0 },
                  );
                  return (
                    <>
                      <div className="rounded-lg bg-green-50 px-4 py-3">
                        <p className="text-xs text-green-600">Total Income</p>
                        <p className="text-lg font-bold text-green-700">{formatCents(totals.income)}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 px-4 py-3">
                        <p className="text-xs text-red-600">Total Expenses</p>
                        <p className="text-lg font-bold text-red-700">{formatCents(totals.expenses)}</p>
                      </div>
                      <div className={cn('rounded-lg px-4 py-3', totals.net >= 0 ? 'bg-blue-50' : 'bg-amber-50')}>
                        <p className={cn('text-xs', totals.net >= 0 ? 'text-blue-600' : 'text-amber-600')}>Net Income</p>
                        <p className={cn('text-lg font-bold', totals.net >= 0 ? 'text-blue-700' : 'text-amber-700')}>{formatCents(totals.net)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pnlChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={dollarFormatter} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 2: Occupancy Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-emerald-600" />
              Occupancy Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOcc ? (
              <div className="h-48 animate-pulse rounded bg-gray-50" />
            ) : !occupancy ? (
              <p className="py-8 text-center text-sm text-gray-500">No data</p>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-500">Overall Occupancy</span>
                      <span className="font-bold text-gray-900">{occupancy.overall.occupancyPct}%</span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          occupancy.overall.occupancyPct >= 90 ? 'bg-green-500' : occupancy.overall.occupancyPct >= 70 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${occupancy.overall.occupancyPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {occupancy.overall.occupiedUnits} of {occupancy.overall.totalUnits} units occupied
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {occupancy.byProperty.map((p, i) => (
                    <div key={p.propertyId} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: occupancyColors[i % occupancyColors.length] }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{p.propertyName}</span>
                          <span className="text-gray-900">{p.occupancyPct}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.occupancyPct}%`,
                              backgroundColor: occupancyColors[i % occupancyColors.length],
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {p.occupiedUnits}/{p.totalUnits} units — {p.vacantUnits} vacant
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Rent Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Rent Collection (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingColl ? (
              <div className="h-48 animate-pulse rounded bg-gray-50" />
            ) : !collection ? (
              <p className="py-8 text-center text-sm text-gray-500">No data</p>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-green-600">Collected</p>
                      <p className="text-sm font-bold text-green-700">{collection.overall.totalCollected}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-xs text-red-600">Overdue</p>
                      <p className="text-sm font-bold text-red-700">{collection.overall.totalOverdue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600">Rate</p>
                      <p className="text-sm font-bold text-blue-700">{collection.overall.collectionPct}%</p>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={collectionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={dollarFormatter} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend />
                    <Bar dataKey="Due" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Renovation Budget Burn */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-amber-600" />
            Renovation Budget Burn
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReno ? (
            <div className="h-48 animate-pulse rounded bg-gray-50" />
          ) : !renovations || renovations.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No active renovations.</p>
          ) : (
            <div className="space-y-6">
              {renovations.map((reno) => (
                <div key={reno.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 break-words">{reno.name}</h4>
                      <p className="text-xs text-gray-500">{reno.propertyName} — {reno.status.replace('_', ' ')}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCents(reno.actualCostCents)} / {formatCents(reno.budgetCents)}
                      </p>
                      <p className={cn('text-xs font-medium', reno.budgetUsedPct > 100 ? 'text-red-600' : reno.budgetUsedPct > 80 ? 'text-amber-600' : 'text-green-600')}>
                        {reno.budgetUsedPct}% used
                      </p>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 mb-3">
                    <div
                      className={cn('h-full rounded-full', reno.budgetUsedPct > 100 ? 'bg-red-500' : reno.budgetUsedPct > 80 ? 'bg-amber-500' : 'bg-green-500')}
                      style={{ width: `${Math.min(reno.budgetUsedPct, 100)}%` }}
                    />
                  </div>
                  {reno.burnData.length > 0 && (
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={reno.burnData.map((d) => ({ ...d, Spent: toDollars(d.cumulativeCents), Budget: toDollars(reno.budgetCents), month: formatMonth(d.month) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={dollarFormatter} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={tooltipFormatter} />
                        <Line type="monotone" dataKey="Spent" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Budget" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Investor Returns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-indigo-600" />
            Investor Returns Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRet ? (
            <div className="h-48 animate-pulse rounded bg-gray-50" />
          ) : !returns || returns.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No investors.</p>
          ) : (
            <>
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={returns.map((r) => ({
                    name: r.name.split(' ')[0],
                    'Profit Share': toDollars(r.profitShareCents),
                    'Distributed': toDollars(r.totalDistributedCents),
                    'Undistributed': toDollars(r.undistributedCents),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={dollarFormatter} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend />
                    <Bar dataKey="Profit Share" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Distributed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Undistributed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ResponsiveTable<InvestorReturn>
                rows={returns}
                rowKey={(r) => r.id}
                columns={returnsColumns}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
