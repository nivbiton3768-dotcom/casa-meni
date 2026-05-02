'use client';

import { useState, FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
}

interface PropertiesResponse {
  properties: Property[];
}

interface AddTransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const incomeCategories = [
  'rent',
  'rental_income',
  'late_fee',
  'parking',
  'laundry',
  'pet_fee',
  'application_fee',
  'other_income',
];

const expenseCategories = [
  'mortgage',
  'insurance',
  'taxes',
  'maintenance',
  'utilities',
  'cleaning',
  'management',
  'hoa',
  'legal',
  'advertising',
  'supplies',
  'travel',
  'other_expense',
];

export function AddTransactionForm({
  onSuccess,
  onCancel,
}: AddTransactionFormProps) {
  const { success, error: showError } = useToast();
  const { data: propData } = useApi<PropertiesResponse>('/properties?pageSize=100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'EXPENSE',
    propertyId: '',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const categories =
    form.type === 'INCOME' ? incomeCategories : expenseCategories;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          propertyId: form.propertyId || undefined,
          category: form.category,
          description: form.description,
          amountCents: Math.round(parseFloat(form.amount) * 100),
          date: form.date,
        }),
      });
      success('Transaction saved', `${form.type === 'INCOME' ? 'Income' : 'Expense'} has been recorded.`);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create transaction';
      setError(msg);
      showError('Failed to save transaction', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Type *
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              update('type', 'INCOME');
              update('category', '');
            }}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              form.type === 'INCOME'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => {
              update('type', 'EXPENSE');
              update('category', '');
            }}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              form.type === 'EXPENSE'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Expense
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Property (optional)
        </label>
        <Select
          value={form.propertyId}
          onChange={(e) => update('propertyId', e.target.value)}
        >
          <option value="">General (no property)</option>
          {propData?.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Category *
        </label>
        <Select
          value={form.category}
          onChange={(e) => update('category', e.target.value)}
          required
        >
          <option value="">Select category...</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description *
        </label>
        <Input
          placeholder="e.g. April rent - Unit 2A"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Amount ($) *
          </label>
          <Input
            type="number"
            placeholder="2900.00"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
            step="0.01"
            min="0.01"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Date *
          </label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Transaction'}
        </Button>
      </div>
    </form>
  );
}
