'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface AddDistributionFormProps {
  investorId: string;
  investorName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddDistributionForm({ investorId, investorName, onSuccess, onCancel }: AddDistributionFormProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/investors/distributions', {
        method: 'POST',
        body: JSON.stringify({
          investorId,
          amountCents: Math.round(parseFloat(form.amount) * 100),
          date: form.date,
          notes: form.notes || undefined,
        }),
      });
      success('Distribution recorded', `$${parseFloat(form.amount).toFixed(2)} distributed to ${investorName}.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not record distribution');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        Recording distribution for <strong>{investorName}</strong>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount ($) *</label>
          <Input type="number" placeholder="5000.00" step="0.01" min="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
          <Input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <Textarea placeholder="Q1 2026 distribution, K-1 reference..." value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Recording...' : 'Record Distribution'}</Button>
      </div>
    </form>
  );
}
