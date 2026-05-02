'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Plus, Trash2 } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
}

interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  type: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
}

interface TrialBalance {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export default function AccountingPage() {
  const { data: accounts, refetch: refetchAccounts } =
    useApi<Account[]>('/accounting/accounts');
  const { data: trial, refetch: refetchTrial } =
    useApi<TrialBalance>('/accounting/trial-balance');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState([
    { accountId: '', debitCents: 0, creditCents: 0, memo: '' },
    { accountId: '', debitCents: 0, creditCents: 0, memo: '' },
  ]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
  });

  const totalD = lines.reduce((s, l) => s + Number(l.debitCents), 0);
  const totalC = lines.reduce((s, l) => s + Number(l.creditCents), 0);
  const balanced = totalD === totalC && totalD > 0;

  const submit = async () => {
    try {
      await apiFetch('/accounting/entries', {
        method: 'POST',
        body: JSON.stringify({ ...form, lines }),
      });
      toast.success('Journal entry posted');
      setOpen(false);
      setLines([
        { accountId: '', debitCents: 0, creditCents: 0, memo: '' },
        { accountId: '', debitCents: 0, creditCents: 0, memo: '' },
      ]);
      refetchTrial();
    } catch (err) {
      toast.error('Failed', err instanceof Error ? err.message : '');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        description="Double-entry general ledger and trial balance."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Journal Entry
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Trial Balance</h3>
            <span
              className={`rounded px-3 py-1 text-sm font-semibold ${trial?.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
            >
              {trial?.isBalanced ? 'Balanced' : 'Out of balance'}
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Code</th>
                  <th className="py-2">Account</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Debit</th>
                  <th className="py-2 text-right">Credit</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {trial?.rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-1.5 font-mono text-xs">{r.code}</td>
                    <td className="py-1.5">{r.name}</td>
                    <td className="py-1.5 text-xs text-gray-500">{r.type}</td>
                    <td className="py-1.5 text-right">${(r.debitCents / 100).toFixed(2)}</td>
                    <td className="py-1.5 text-right">${(r.creditCents / 100).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-semibold">
                      ${(r.balanceCents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={3} className="py-2">
                    TOTAL
                  </td>
                  <td className="py-2 text-right">
                    ${((trial?.totalDebit ?? 0) / 100).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    ${((trial?.totalCredit ?? 0) / 100).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Journal Entry">
        <div className="space-y-3">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            placeholder="Reference (optional)"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                <Select
                  value={line.accountId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].accountId = e.target.value;
                    setLines(next);
                  }}
                  className="col-span-5"
                >
                  <option value="">Select account…</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} {a.name}
                    </option>
                  ))}
                </Select>
                <Input
                  className="col-span-3"
                  type="number"
                  placeholder="Debit"
                  value={line.debitCents / 100 || ''}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].debitCents = Math.round(Number(e.target.value) * 100);
                    setLines(next);
                  }}
                />
                <Input
                  className="col-span-3"
                  type="number"
                  placeholder="Credit"
                  value={line.creditCents / 100 || ''}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].creditCents = Math.round(Number(e.target.value) * 100);
                    setLines(next);
                  }}
                />
                <button
                  className="col-span-1 text-red-600"
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() =>
                setLines([
                  ...lines,
                  { accountId: '', debitCents: 0, creditCents: 0, memo: '' },
                ])
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Add line
            </Button>
          </div>
          <div className="flex justify-between text-sm">
            <span>
              Debits: <strong>${(totalD / 100).toFixed(2)}</strong>
            </span>
            <span>
              Credits: <strong>${(totalC / 100).toFixed(2)}</strong>
            </span>
            <span
              className={
                balanced ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'
              }
            >
              {balanced ? '✓ Balanced' : `Off by $${Math.abs((totalD - totalC) / 100).toFixed(2)}`}
            </span>
          </div>
          <Button onClick={submit} disabled={!balanced} className="w-full">
            Post entry
          </Button>
        </div>
      </Modal>
    </div>
  );
}
