'use client';

import { useState, FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  trade: string | null;
}

interface AddExpenseFormProps {
  renovationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'materials', label: 'Materials (Home Depot, Lowes, etc.)' },
  { value: 'labor', label: 'Labor' },
  { value: 'permits', label: 'Permits & Fees' },
  { value: 'fixtures', label: 'Fixtures & Fittings' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'dumpster', label: 'Dumpster / Disposal' },
  { value: 'other', label: 'Other' },
];

export function AddExpenseForm({ renovationId, onSuccess, onCancel }: AddExpenseFormProps) {
  const { success, error: showError } = useToast();
  const { data: vendors } = useApi<Vendor[]>('/vendors');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendorId: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/renovations/${renovationId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          category: form.category,
          description: form.description,
          amountCents: Math.round(parseFloat(form.amount) * 100),
          date: form.date,
          vendorId: form.vendorId || undefined,
        }),
      });
      success('Expense added', `$${parseFloat(form.amount).toFixed(2)} recorded.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
          <Select value={form.category} onChange={(e) => update('category', e.target.value)} required>
            <option value="">Select category...</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
          <Input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
        <Input placeholder="HD #4521 — 2x4 lumber, drywall, screws..." value={form.description} onChange={(e) => update('description', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount ($) *</label>
          <Input type="number" placeholder="1250.00" step="0.01" min="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Vendor / Contractor</label>
          <Select value={form.vendorId} onChange={(e) => update('vendorId', e.target.value)}>
            <option value="">None</option>
            {vendors?.map((v) => (
              <option key={v.id} value={v.id}>{v.name}{v.trade ? ` (${v.trade})` : ''}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Expense'}</Button>
      </div>
    </form>
  );
}
