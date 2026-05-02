'use client';

import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCents } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  Wrench,
  Users,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Home,
} from 'lucide-react';

interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  activeTenants: number;
  openWorkOrders: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  netIncomeCents: number;
  overduePayments: number;
  upcomingReservations: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, loading } = useApi<DashboardStats>(
    '/properties/dashboard-stats',
  );

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}. Here&apos;s
          your portfolio overview.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-100" />
                <div className="space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                  <div className="h-6 w-12 animate-pulse rounded bg-gray-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard
              name="Properties"
              value={stats.totalProperties.toString()}
              icon={Building2}
              color="text-blue-600 bg-blue-50"
            />
            <StatCard
              name="Total Revenue"
              value={formatCents(stats.totalIncomeCents)}
              icon={DollarSign}
              color="text-green-600 bg-green-50"
            />
            <StatCard
              name="Active Tenants"
              value={stats.activeTenants.toString()}
              icon={Users}
              color="text-purple-600 bg-purple-50"
            />
            <StatCard
              name="Open Work Orders"
              value={stats.openWorkOrders.toString()}
              icon={Wrench}
              color="text-orange-600 bg-orange-50"
            />
            <StatCard
              name="Occupancy Rate"
              value={`${stats.occupancyRate}%`}
              subtitle={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
              icon={TrendingUp}
              color="text-teal-600 bg-teal-50"
            />
            <StatCard
              name="Overdue Payments"
              value={stats.overduePayments.toString()}
              icon={AlertTriangle}
              color={
                stats.overduePayments > 0
                  ? 'text-red-600 bg-red-50'
                  : 'text-gray-500 bg-gray-50'
              }
            />
            <StatCard
              name="Net Income"
              value={formatCents(stats.netIncomeCents)}
              icon={Home}
              color={
                stats.netIncomeCents >= 0
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-red-600 bg-red-50'
              }
            />
            <StatCard
              name="Upcoming Reservations"
              value={stats.upcomingReservations.toString()}
              icon={CalendarDays}
              color="text-indigo-600 bg-indigo-50"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Income</span>
                    <span className="font-semibold text-green-600">
                      {formatCents(stats.totalIncomeCents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Total Expenses
                    </span>
                    <span className="font-semibold text-red-600">
                      {formatCents(stats.totalExpensesCents)}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Net Operating Income
                      </span>
                      <span
                        className={`text-lg font-bold ${stats.netIncomeCents >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCents(stats.netIncomeCents)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{
                        width: `${Math.min(100, stats.totalIncomeCents > 0 ? ((stats.totalIncomeCents - stats.totalExpensesCents) / stats.totalIncomeCents) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {stats.totalIncomeCents > 0
                      ? `${Math.round(((stats.totalIncomeCents - stats.totalExpensesCents) / stats.totalIncomeCents) * 100)}% profit margin`
                      : 'No income recorded yet'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <HealthRow
                    label="Occupancy"
                    value={`${stats.occupancyRate}%`}
                    status={
                      stats.occupancyRate >= 90
                        ? 'good'
                        : stats.occupancyRate >= 70
                          ? 'warning'
                          : 'bad'
                    }
                  />
                  <HealthRow
                    label="Overdue Payments"
                    value={stats.overduePayments.toString()}
                    status={stats.overduePayments === 0 ? 'good' : 'bad'}
                  />
                  <HealthRow
                    label="Open Work Orders"
                    value={stats.openWorkOrders.toString()}
                    status={
                      stats.openWorkOrders <= 2
                        ? 'good'
                        : stats.openWorkOrders <= 5
                          ? 'warning'
                          : 'bad'
                    }
                  />
                  <HealthRow
                    label="Upcoming Check-ins"
                    value={stats.upcomingReservations.toString()}
                    status="info"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  name,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  name: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-6">
        <div className={`shrink-0 rounded-lg p-2.5 md:p-3 ${color}`}>
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-500 md:text-sm">{name}</p>
          <p className="truncate text-lg font-bold text-gray-900 md:text-2xl">{value}</p>
          {subtitle && (
            <p className="truncate text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HealthRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'bad' | 'info';
}) {
  const dotColor = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    bad: 'bg-red-500',
    info: 'bg-blue-500',
  }[status];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
