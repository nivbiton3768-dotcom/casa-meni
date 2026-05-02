'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface Account {
  id: string;
  name: string;
  provider: 'PLAID' | 'MANUAL';
}

interface Props {
  accounts: Account[];
  defaultAccountId?: string;
  onCreated?: (autoMatched: boolean) => void;
  onCancel?: () => void;
}

export function CreateManualTransactionForm({
  accounts,
  defaultAccountId,
  onCreated,
  onCancel,
}: Props) {
  const manualOnly = accounts.filter((a) => a.provider === 'MANUAL');
  const [bankAccountId, setBankAccountId] = useState(
    defaultAccountId ?? manualOnly[0]?.id ?? '',
  );
  const [direction, setDirection] = useState<'INCOMING' | 'OUTGOING'>(
    'INCOMING',
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountId) {
      toast.error('Pick an account');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ data: { autoMatched: boolean } }>(
        '/banking/transactions/manual',
        {
          method: 'POST',
          body: JSON.stringify({
            bankAccountId,
            direction,
            amountCents: Math.round(parseFloat(amount) * 100),
            description,
            counterpartyName: counterpartyName || undefined,
            date,
            notes: notes || undefined,
          }),
        },
      );
      const auto = res.data.autoMatched;
      toast.success(
        auto ? 'Transaction added & auto-matched' : 'Transaction added',
        auto ? 'Casa Meni matched it to an unpaid rent payment.' : '',
      );
      onCreated?.(auto);
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : '');
    } finally {
      setSubmitting(false);
    }
  };

  if (manualOnly.length === 0) {
    return (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          You don&apos;t have any manual accounts yet. Manual accounts are for things
          like Venmo or in-app balances that can&apos;t be Plaid-linked.
        </p>
        <p>Add one first, then come back to log a transaction here.</p>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Account</label>
        <Select
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
        >
          {manualOnly.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Direction
        </label>
        <Select
          value={direction}
          onChange={(e) => setDirection(e.target.value as 'INCOMING' | 'OUTGOING')}
        >
          <option value="INCOMING">Money in (received)</option>
          <option value="OUTGOING">Money out (spent)</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Amount ($)
          </label>
          <Input
            required
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1500.00"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
          <Input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <Input
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Rent for May"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          From / To (counterparty name)
        </label>
        <Input
          value={counterpartyName}
          onChange={(e) => setCounterpartyName(e.target.value)}
          placeholder={direction === 'INCOMING' ? 'John Smith' : 'Home Depot'}
        />
        {direction === 'INCOMING' && (
          <p className="mt-1 text-xs text-gray-500">
            Use the tenant&apos;s name to help auto-matching.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  );
}
