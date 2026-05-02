'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { AddTransactionForm } from '@/components/forms/add-transaction-form';
import { formatCents, cn } from '@/lib/utils';
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string;
  amountCents: number;
  date: string;
  property: { id: string; name: string } | null;
}

interface PnlData {
  totalIncomeCents: number;
  totalExpensesCents: number;
  netIncomeCents: number;
}

export default function TransactionsPage() {
  const {
    data: transactions,
    loading: txLoading,
    refetch: refetchTx,
  } = useApi<Transaction[]>('/transactions');
  const {
    data: pnl,
    loading: pnlLoading,
    refetch: refetchPnl,
  } = useApi<PnlData>('/transactions/pnl');
  const [showAdd, setShowAdd] = useState(false);

  const loading = txLoading || pnlLoading;

  const handleSuccess = () => {
    setShowAdd(false);
    refetchTx();
    refetchPnl();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Income, expenses, and P&L tracking"
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        }
      />

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Transaction"
        size="md"
      >
        <AddTransactionForm
          onSuccess={handleSuccess}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-6">
            <div className="shrink-0 rounded-lg bg-green-50 p-2.5 md:p-3">
              <TrendingUp className="h-5 w-5 text-green-600 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 md:text-sm">Total Income</p>
              <p className="truncate text-lg font-bold text-gray-900 md:text-2xl">
                {loading ? '...' : formatCents(pnl?.totalIncomeCents || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-6">
            <div className="shrink-0 rounded-lg bg-red-50 p-2.5 md:p-3">
              <TrendingDown className="h-5 w-5 text-red-600 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 md:text-sm">Total Expenses</p>
              <p className="truncate text-lg font-bold text-gray-900 md:text-2xl">
                {loading ? '...' : formatCents(pnl?.totalExpensesCents || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-6">
            <div className="shrink-0 rounded-lg bg-blue-50 p-2.5 md:p-3">
              <DollarSign className="h-5 w-5 text-blue-600 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 md:text-sm">Net Income</p>
              <p
                className={cn(
                  'truncate text-lg font-bold md:text-2xl',
                  (pnl?.netIncomeCents || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600',
                )}
              >
                {loading ? '...' : formatCents(pnl?.netIncomeCents || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b py-3 last:border-0"
              >
                <div className="space-y-1">
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-5 w-20 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !transactions || transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-green-50 p-4">
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No transactions yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Record income and expenses to track your financial performance.
            </p>
            <Button className="mt-6" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Transaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Transaction History ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {transactions.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          isIncome ? 'bg-green-50' : 'bg-red-50',
                        )}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {tx.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tx.property?.name || 'General'} &middot;{' '}
                          <span className="capitalize">
                            {tx.category.replace(/_/g, ' ')}
                          </span>{' '}
                          &middot; {new Date(tx.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold',
                        isIncome ? 'text-green-600' : 'text-red-600',
                      )}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCents(tx.amountCents)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
