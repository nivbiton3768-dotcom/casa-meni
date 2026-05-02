'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AddRenovationForm } from '@/components/forms/add-renovation-form';
import { formatCents, cn } from '@/lib/utils';
import {
  Hammer,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface RenovationExpense {
  id: string;
  category: string;
  description: string;
  amountCents: number;
  date: string;
}

interface Renovation {
  id: string;
  name: string;
  status: string;
  budgetCents: number;
  actualCostCents: number;
  startDate: string | null;
  endDate: string | null;
  property: { id: string; name: string; address: string };
  expenses: RenovationExpense[];
  _count: { expenses: number };
}

const statusStyles: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-gray-100 text-gray-600',
};

export default function RenovationsPage() {
  const { data: renovations, loading, refetch } = useApi<Renovation[]>('/renovations');
  const [showCreate, setShowCreate] = useState(false);

  const totalBudget = renovations?.reduce((s, r) => s + r.budgetCents, 0) || 0;
  const totalSpent = renovations?.reduce((s, r) => s + r.actualCostCents, 0) || 0;
  const activeCount = renovations?.filter((r) => r.status === 'IN_PROGRESS').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Renovations</h1>
          <p className="text-sm text-gray-500">
            {renovations
              ? `${renovations.length} projects, ${activeCount} active`
              : 'Loading...'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Renovation
        </Button>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Start New Renovation" size="lg">
        <AddRenovationForm onSuccess={() => { setShowCreate(false); refetch(); }} onCancel={() => setShowCreate(false)} />
      </Modal>

      {/* Summary Cards */}
      {renovations && renovations.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-50 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Budget</p>
                <p className="text-lg font-bold text-gray-900">{formatCents(totalBudget)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('rounded-lg p-2', totalSpent > totalBudget ? 'bg-red-50' : 'bg-green-50')}>
                <TrendingUp className={cn('h-5 w-5', totalSpent > totalBudget ? 'text-red-600' : 'text-green-600')} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className={cn('text-lg font-bold', totalSpent > totalBudget ? 'text-red-600' : 'text-gray-900')}>
                  {formatCents(totalSpent)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('rounded-lg p-2', totalBudget - totalSpent < 0 ? 'bg-red-50' : 'bg-emerald-50')}>
                {totalBudget - totalSpent < 0 ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Remaining</p>
                <p className={cn('text-lg font-bold', totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {formatCents(Math.abs(totalBudget - totalSpent))}
                  {totalBudget - totalSpent < 0 && ' over'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-24 animate-pulse rounded bg-gray-50" /></CardContent></Card>
          ))}
        </div>
      ) : !renovations || renovations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-amber-50 p-4">
              <Hammer className="h-10 w-10 text-amber-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No renovations yet</h3>
            <p className="mt-1 text-sm text-gray-500">Start tracking your first remodeling project.</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Start First Renovation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {renovations.map((reno) => {
            const pct = reno.budgetCents > 0 ? Math.round((reno.actualCostCents / reno.budgetCents) * 100) : 0;
            const overBudget = reno.actualCostCents > reno.budgetCents;

            return (
              <Link key={reno.id} href={`/renovations/${reno.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn('rounded-lg p-2.5', overBudget ? 'bg-red-50' : 'bg-amber-50')}>
                          <Hammer className={cn('h-6 w-6', overBudget ? 'text-red-600' : 'text-amber-600')} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{reno.name}</h3>
                            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyles[reno.status] || 'bg-gray-100 text-gray-600')}>
                              {reno.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {reno.property.name}
                            </span>
                            {reno.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(reno.startDate).toLocaleDateString()}
                                {reno.endDate && ` — ${new Date(reno.endDate).toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCents(reno.actualCostCents)} / {formatCents(reno.budgetCents)}
                        </p>
                        <p className="text-xs text-gray-500">{reno._count.expenses} expenses</p>
                      </div>
                    </div>

                    {/* Budget bar */}
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-gray-500">Budget used</span>
                        <span className={cn('font-medium', overBudget ? 'text-red-600' : 'text-gray-700')}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn('h-full rounded-full transition-all', overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500')}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
