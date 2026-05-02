'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiFetch } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface Props {
  onCreated?: () => void;
  onCancel?: () => void;
}

export function CreateManualAccountForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'WALLET' | 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'OTHER'>('WALLET');
  const [institutionName, setInstitutionName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/banking/accounts/manual', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          institutionName: institutionName || undefined,
          openingBalanceCents: Math.round(parseFloat(openingBalance || '0') * 100),
        }),
      });
      toast.success('Account added');
      onCreated?.();
    } catch (err) {
      toast.error('Could not add account', err instanceof Error ? err.message : '');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
        Use this for Venmo, in-app balances, or any account you can&apos;t connect via Plaid.
        You&apos;ll log incoming/outgoing transactions manually or by uploading a CSV export.
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Account name
        </label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Venmo — Niv"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value as 'WALLET' | 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'OTHER')}>
            <option value="WALLET">Wallet (Venmo, Zelle, etc.)</option>
            <option value="CHECKING">Checking</option>
            <option value="SAVINGS">Savings</option>
            <option value="CREDIT">Credit card</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Opening balance ($)
          </label>
          <Input
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Institution / app name (optional)
        </label>
        <Input
          value={institutionName}
          onChange={(e) => setInstitutionName(e.target.value)}
          placeholder="Venmo, Zelle, Chase, etc."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add Account'}
        </Button>
      </div>
    </form>
  );
}
