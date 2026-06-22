'use client';

import { useMemo, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch, formatCents } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { PlaidLinkButton } from '@/components/banking/plaid-link-button';
import { CreateManualAccountForm } from '@/components/banking/create-manual-account-form';
import { CreateManualTransactionForm } from '@/components/banking/create-manual-transaction-form';
import { MatchTransactionPicker } from '@/components/banking/match-transaction-picker';
import {
  Landmark,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface Account {
  id: string;
  provider: 'PLAID' | 'MANUAL';
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'WALLET' | 'OTHER';
  name: string;
  institutionName: string | null;
  mask: string | null;
  currentBalanceCents: number;
  lastSyncedAt: string | null;
}

interface MatchedPaymentInfo {
  id: string;
  amountCents: number;
  dueDate: string;
  lease: {
    tenant: { name: string; email: string };
    unit: { unitNumber: string; property: { name: string } };
  };
}

interface BankTxn {
  id: string;
  bankAccountId: string;
  direction: 'INCOMING' | 'OUTGOING';
  amountCents: number;
  description: string;
  merchantName: string | null;
  counterpartyName: string | null;
  date: string;
  category: string | null;
  matchStatus: 'UNMATCHED' | 'MATCHED' | 'IGNORED' | 'REVIEW';
  matchedAutomatically: boolean;
  notes: string | null;
  bankAccount: { id: string; name: string; mask: string | null };
  matchedPayment: MatchedPaymentInfo | null;
}

interface UnpaidPayment {
  id: string;
  amountCents: number;
  dueDate: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
}

interface Settings {
  plaidEnabled: boolean;
  env: string;
}

type Tab = 'review' | 'unmatched' | 'matched' | 'all' | 'ignored';

export default function BankingPage() {
  const { data: settings } = useApi<Settings>('/banking/settings');
  const {
    data: accounts,
    loading: accountsLoading,
    refetch: refetchAccounts,
  } = useApi<Account[]>('/banking/accounts');
  const {
    data: txns,
    loading: txnsLoading,
    refetch: refetchTxns,
  } = useApi<BankTxn[]>('/banking/transactions?limit=300');
  const { data: unpaid, refetch: refetchUnpaid } = useApi<UnpaidPayment[]>(
    '/banking/unpaid-payments',
  );

  const [tab, setTab] = useState<Tab>('review');
  const [accountFilter, setAccountFilter] = useState<string | 'all'>('all');
  const [showAddManual, setShowAddManual] = useState(false);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  const refetchAll = () => {
    refetchAccounts();
    refetchTxns();
    refetchUnpaid();
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch<{
        data: {
          added: number;
          modified: number;
          autoMatched: number;
        };
      }>('/banking/sync', { method: 'POST' });
      const r = res.data;
      toast.success(
        'Sync complete',
        `${r.added} new transactions${r.autoMatched ? ` · ${r.autoMatched} auto-matched` : ''}`,
      );
      refetchAll();
    } catch (err) {
      toast.error('Sync failed', err instanceof Error ? err.message : '');
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async (accountId: string) => {
    if (
      !confirm(
        'Disconnect this account? Existing transactions stay, but new ones won\'t sync.',
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/banking/accounts/${accountId}`, { method: 'DELETE' });
      toast.success('Disconnected');
      refetchAccounts();
    } catch (err) {
      toast.error('Disconnect failed', err instanceof Error ? err.message : '');
    }
  };

  const ignoreTxn = async (id: string) => {
    try {
      await apiFetch(`/banking/transactions/${id}/ignore`, { method: 'POST' });
      refetchTxns();
    } catch (err) {
      toast.error('Failed', err instanceof Error ? err.message : '');
    }
  };

  const unmatchTxn = async (id: string) => {
    if (!confirm('Unmatch this transaction? The rent will be marked unpaid again.')) {
      return;
    }
    try {
      await apiFetch(`/banking/transactions/${id}/unmatch`, { method: 'POST' });
      toast.success('Unmatched');
      refetchAll();
    } catch (err) {
      toast.error('Failed', err instanceof Error ? err.message : '');
    }
  };

  const filteredTxns = useMemo(() => {
    if (!txns) return [];
    let list = txns;
    if (accountFilter !== 'all') {
      list = list.filter((t) => t.bankAccountId === accountFilter);
    }
    if (tab === 'review') return list.filter((t) => t.matchStatus === 'REVIEW');
    if (tab === 'unmatched')
      return list.filter(
        (t) =>
          t.matchStatus === 'UNMATCHED' && t.direction === 'INCOMING',
      );
    if (tab === 'matched')
      return list.filter((t) => t.matchStatus === 'MATCHED');
    if (tab === 'ignored')
      return list.filter((t) => t.matchStatus === 'IGNORED');
    return list;
  }, [txns, tab, accountFilter]);

  const stats = useMemo(() => {
    if (!txns) return null;
    return {
      review: txns.filter((t) => t.matchStatus === 'REVIEW').length,
      unmatched: txns.filter(
        (t) => t.matchStatus === 'UNMATCHED' && t.direction === 'INCOMING',
      ).length,
      matched: txns.filter((t) => t.matchStatus === 'MATCHED').length,
      ignored: txns.filter((t) => t.matchStatus === 'IGNORED').length,
      autoMatched: txns.filter(
        (t) => t.matchStatus === 'MATCHED' && t.matchedAutomatically,
      ).length,
    };
  }, [txns]);

  const totalBalance = accounts
    ? accounts.reduce((sum, a) => sum + a.currentBalanceCents, 0)
    : 0;

  const hasPlaidAccounts = accounts?.some((a) => a.provider === 'PLAID');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banking"
        description="Auto-match incoming rent payments from your bank, Cash App, Chime, Venmo, and more."
        actions={
          <div className="flex flex-wrap gap-2">
            {hasPlaidAccounts && (
              <Button
                variant="secondary"
                onClick={sync}
                disabled={syncing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                />
                {syncing ? 'Syncing…' : 'Sync now'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowAddTxn(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log transaction
            </Button>
          </div>
        }
      />

      {settings && !settings.plaidEnabled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Bank syncing not configured</p>
                <p className="mt-1">
                  To auto-pull transactions from your bank, Cash App, or Chime,
                  set <code className="rounded bg-white px-1 py-0.5 text-xs">PLAID_CLIENT_ID</code>{' '}
                  and{' '}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">PLAID_SECRET</code>{' '}
                  in your environment, then redeploy. You can still use manual
                  accounts and CSV uploads in the meantime.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total balance</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCents(totalBalance)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              across {accounts?.length ?? 0} account{accounts?.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-amber-600">Needs review</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {stats?.review ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">suggested matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-blue-600">Unmatched income</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              {stats?.unmatched ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">incoming, no match</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600">Auto-matched</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {stats?.autoMatched ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              of {stats?.matched ?? 0} matched
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-gray-900">Accounts</h3>
            <div className="flex flex-wrap gap-2">
              {settings?.plaidEnabled && (
                <PlaidLinkButton onLinked={refetchAll} />
              )}
              <Button
                variant="secondary"
                onClick={() => setShowAddManual(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add manual account
              </Button>
            </div>
          </div>

          {accountsLoading ? (
            <div className="mt-4 h-16 animate-pulse rounded bg-gray-50" />
          ) : !accounts || accounts.length === 0 ? (
            <div className="mt-4 rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <Landmark className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">
                No accounts connected yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Link your bank to auto-pull deposits, or add a manual account
                for Venmo / in-app balances.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {a.provider === 'PLAID' ? (
                        <Landmark className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Wallet className="h-4 w-4 text-purple-600" />
                      )}
                      <p className="text-sm font-semibold text-gray-900">
                        {a.name}
                      </p>
                    </div>
                    <button
                      onClick={() => disconnect(a.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-red-600"
                      title="Disconnect"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {a.institutionName ?? a.type}
                    {a.mask ? ` ••••${a.mask}` : ''}
                  </p>
                  <p className="mt-2 text-xl font-bold text-gray-900">
                    {formatCents(a.currentBalanceCents)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {a.lastSyncedAt
                      ? `Synced ${new Date(a.lastSyncedAt).toLocaleString()}`
                      : a.provider === 'MANUAL'
                        ? 'Manual'
                        : 'Never synced'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 md:p-5">
            <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
              {(
                [
                  { id: 'review', label: 'Review', count: stats?.review },
                  { id: 'unmatched', label: 'Unmatched', count: stats?.unmatched },
                  { id: 'matched', label: 'Matched', count: stats?.matched },
                  { id: 'ignored', label: 'Ignored', count: stats?.ignored },
                  { id: 'all', label: 'All' },
                ] as Array<{ id: Tab; label: string; count?: number }>
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t.label}
                  {typeof t.count === 'number' && t.count > 0 && (
                    <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {accounts && accounts.length > 0 && (
              <select
                className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <option value="all">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {txnsLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded bg-gray-50"
                />
              ))}
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <CheckCircle2 className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">
                {tab === 'review'
                  ? 'No suggested matches to review'
                  : tab === 'unmatched'
                    ? 'No unmatched income'
                    : tab === 'ignored'
                      ? 'Nothing ignored'
                      : tab === 'matched'
                        ? 'No matched transactions yet'
                        : 'No transactions yet'}
              </p>
              {tab === 'unmatched' && (
                <p className="mt-1 text-sm text-gray-500">
                  All your incoming money is matched to a rent payment.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTxns.map((t) => (
                <div key={t.id} className="p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        {t.direction === 'INCOMING' ? (
                          <ArrowDownCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {t.counterpartyName || t.merchantName || t.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.bankAccount.name}
                            {' · '}
                            {new Date(t.date).toLocaleDateString()}
                            {t.category ? ` · ${t.category.toLowerCase().replace(/_/g, ' ')}` : ''}
                          </p>
                          {t.description &&
                            t.description !==
                              (t.counterpartyName || t.merchantName) && (
                              <p className="mt-1 break-words font-mono text-[11px] leading-snug text-gray-400">
                                {t.description}
                              </p>
                            )}
                        </div>
                      </div>

                      {t.matchStatus === 'MATCHED' && t.matchedPayment && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="text-emerald-900">
                            Matched to{' '}
                            <span className="font-semibold">
                              {t.matchedPayment.lease.tenant.name}
                            </span>
                            {' '}rent · {t.matchedPayment.lease.unit.property.name}{' '}
                            #{t.matchedPayment.lease.unit.unitNumber}
                          </span>
                          {t.matchedAutomatically && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <Sparkles className="h-2.5 w-2.5" /> Auto
                            </span>
                          )}
                        </div>
                      )}

                      {t.matchStatus === 'REVIEW' && t.notes && (
                        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          <p className="font-semibold">Suggested match:</p>
                          <p className="mt-0.5 whitespace-pre-line">{t.notes}</p>
                        </div>
                      )}

                      {(t.matchStatus === 'UNMATCHED' ||
                        t.matchStatus === 'REVIEW') &&
                        t.direction === 'INCOMING' && (
                          <div className="mt-2">
                            <MatchTransactionPicker
                              txnId={t.id}
                              txnAmountCents={t.amountCents}
                              payments={unpaid ?? []}
                              onMatched={refetchAll}
                            />
                          </div>
                        )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p
                        className={`text-base font-bold ${
                          t.direction === 'INCOMING'
                            ? 'text-emerald-700'
                            : 'text-gray-900'
                        }`}
                      >
                        {t.direction === 'INCOMING' ? '+' : '−'}
                        {formatCents(t.amountCents)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {t.matchStatus === 'MATCHED' && (
                          <button
                            onClick={() => unmatchTxn(t.id)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Unmatch
                          </button>
                        )}
                        {(t.matchStatus === 'UNMATCHED' ||
                          t.matchStatus === 'REVIEW') && (
                          <button
                            onClick={() => ignoreTxn(t.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
                          >
                            <EyeOff className="h-3 w-3" />
                            Ignore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={showAddManual}
        onClose={() => setShowAddManual(false)}
        title="Add manual account"
        size="md"
      >
        <CreateManualAccountForm
          onCreated={() => {
            setShowAddManual(false);
            refetchAccounts();
          }}
          onCancel={() => setShowAddManual(false)}
        />
      </Modal>

      <Modal
        open={showAddTxn}
        onClose={() => setShowAddTxn(false)}
        title="Log a transaction"
        size="md"
      >
        <CreateManualTransactionForm
          accounts={accounts ?? []}
          onCreated={() => {
            setShowAddTxn(false);
            refetchAll();
          }}
          onCancel={() => setShowAddTxn(false)}
        />
      </Modal>
    </div>
  );
}
