'use client';

import { use, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AddExpenseForm } from '@/components/forms/add-expense-form';
import { formatCents, cn, apiFetch } from '@/lib/utils';
import {
  ArrowLeft,
  Hammer,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Store,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

interface Expense {
  id: string;
  category: string;
  description: string;
  amountCents: number;
  date: string;
  receiptUrl: string | null;
  vendor: { id: string; name: string; trade: string | null } | null;
}

interface RenovationDetail {
  id: string;
  name: string;
  status: string;
  budgetCents: number;
  actualCostCents: number;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  property: { id: string; name: string; address: string };
  expenses: Expense[];
  breakdown: Record<string, number>;
  budgetRemaining: number;
  budgetUsedPct: number;
}

const statusStyles: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-gray-100 text-gray-600',
};

const categoryLabels: Record<string, string> = {
  materials: 'Materials',
  labor: 'Labor',
  permits: 'Permits & Fees',
  fixtures: 'Fixtures',
  appliances: 'Appliances',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  flooring: 'Flooring',
  painting: 'Painting',
  demolition: 'Demolition',
  dumpster: 'Dumpster',
  other: 'Other',
};

const categoryColors: Record<string, string> = {
  materials: 'bg-orange-100 text-orange-700',
  labor: 'bg-blue-100 text-blue-700',
  permits: 'bg-purple-100 text-purple-700',
  fixtures: 'bg-teal-100 text-teal-700',
  appliances: 'bg-indigo-100 text-indigo-700',
  electrical: 'bg-yellow-100 text-yellow-700',
  plumbing: 'bg-cyan-100 text-cyan-700',
  flooring: 'bg-amber-100 text-amber-700',
  painting: 'bg-pink-100 text-pink-700',
  demolition: 'bg-red-100 text-red-700',
  dumpster: 'bg-gray-100 text-gray-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function RenovationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: reno, loading, refetch } = useApi<RenovationDetail>(`/renovations/${id}`);
  const { success, error: showError } = useToast();
  const [showExpense, setShowExpense] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleDeleteExpense = async (expenseId: string) => {
    setDeletingId(expenseId);
    try {
      await apiFetch(`/renovations/expenses/${expenseId}`, { method: 'DELETE' });
      success('Expense removed', 'Expense deleted and budget updated.');
      refetch();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await apiFetch(`/renovations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      success('Status updated', `Renovation marked as ${newStatus.replace('_', ' ')}.`);
      refetch();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse rounded bg-gray-50" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!reno) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500">Renovation not found.</p>
        <Link href="/renovations" className="mt-2 text-sm text-blue-600 hover:underline">Back to Renovations</Link>
      </div>
    );
  }

  const overBudget = reno.budgetRemaining < 0;
  const breakdownEntries = Object.entries(reno.breakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/renovations" className="rounded-lg border p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{reno.name}</h1>
              <span className={cn('rounded-full px-3 py-0.5 text-xs font-medium', statusStyles[reno.status] || 'bg-gray-100 text-gray-600')}>
                {reno.status.replace('_', ' ')}
              </span>
            </div>
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              <Link href={`/properties/${reno.property.id}`} className="hover:underline">
                {reno.property.name}
              </Link>
              — {reno.property.address}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reno.status !== 'COMPLETED' && (
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={reno.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
            >
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          )}
          <Button onClick={() => setShowExpense(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <Modal open={showExpense} onClose={() => setShowExpense(false)} title="Add Expense" size="lg">
        <AddExpenseForm renovationId={id} onSuccess={() => { setShowExpense(false); refetch(); }} onCancel={() => setShowExpense(false)} />
      </Modal>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><DollarSign className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-lg font-bold text-gray-900">{formatCents(reno.budgetCents)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', overBudget ? 'bg-red-50' : 'bg-green-50')}>
                <TrendingUp className={cn('h-5 w-5', overBudget ? 'text-red-600' : 'text-green-600')} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Spent</p>
                <p className={cn('text-lg font-bold', overBudget ? 'text-red-600' : 'text-gray-900')}>{formatCents(reno.actualCostCents)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', overBudget ? 'bg-red-50' : 'bg-emerald-50')}>
                {overBudget ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <DollarSign className="h-5 w-5 text-emerald-600" />}
              </div>
              <div>
                <p className="text-xs text-gray-500">{overBudget ? 'Over Budget' : 'Remaining'}</p>
                <p className={cn('text-lg font-bold', overBudget ? 'text-red-600' : 'text-emerald-600')}>
                  {formatCents(Math.abs(reno.budgetRemaining))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2"><Wrench className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-lg font-bold text-gray-900">{reno.expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">Budget Progress</span>
            <span className={cn('font-medium', overBudget ? 'text-red-600' : 'text-gray-700')}>
              {reno.budgetUsedPct}%
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full transition-all', overBudget ? 'bg-red-500' : reno.budgetUsedPct > 80 ? 'bg-amber-500' : 'bg-green-500')}
              style={{ width: `${Math.min(reno.budgetUsedPct, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Breakdown by Category */}
        <Card>
          <CardHeader><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            {breakdownEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {breakdownEntries.map(([cat, cents]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{categoryLabels[cat] || cat}</span>
                      <span className="text-gray-900">{formatCents(cents)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn('h-full rounded-full', categoryColors[cat]?.includes('bg-') ? 'bg-blue-400' : 'bg-blue-400')}
                        style={{ width: `${reno.actualCostCents > 0 ? (cents / reno.actualCostCents) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense List */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">All Expenses ({reno.expenses.length})</CardTitle>
                <Button size="sm" onClick={() => setShowExpense(true)} className="flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reno.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Hammer className="h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No expenses yet. Add your first purchase or labor cost.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reno.expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', categoryColors[exp.category] || 'bg-gray-100 text-gray-600')}>
                          {categoryLabels[exp.category] || exp.category}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{exp.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(exp.date).toLocaleDateString()}
                            </span>
                            {exp.vendor && (
                              <span className="flex items-center gap-1">
                                <Store className="h-3 w-3" />
                                {exp.vendor.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCents(exp.amountCents)}
                        </p>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          disabled={deletingId === exp.id}
                          className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes */}
      {reno.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{reno.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Date info */}
      {(reno.startDate || reno.endDate) && (
        <div className="flex gap-4 text-sm text-gray-500">
          {reno.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Started: {new Date(reno.startDate).toLocaleDateString()}
            </span>
          )}
          {reno.endDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Target End: {new Date(reno.endDate).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
