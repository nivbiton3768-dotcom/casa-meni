'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface AddUnitFormProps {
  propertyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddUnitForm({ propertyId, onSuccess, onCancel }: AddUnitFormProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    unitNumber: '',
    bedrooms: '1',
    bathrooms: '1',
    sqft: '',
    rentAmountCents: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/units', {
        method: 'POST',
        body: JSON.stringify({
          propertyId,
          unitNumber: form.unitNumber,
          bedrooms: parseInt(form.bedrooms),
          bathrooms: parseFloat(form.bathrooms),
          sqft: form.sqft ? parseInt(form.sqft) : undefined,
          rentAmountCents: Math.round(parseFloat(form.rentAmountCents) * 100),
        }),
      });
      success('Unit added', `Unit ${form.unitNumber} has been added.`);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create unit';
      setError(msg);
      showError('Failed to add unit', msg);
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
          Unit Number / Name *
        </label>
        <Input
          placeholder="e.g. 1A, 2B, MAIN"
          value={form.unitNumber}
          onChange={(e) => update('unitNumber', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Bedrooms *
          </label>
          <Input
            type="number"
            value={form.bedrooms}
            onChange={(e) => update('bedrooms', e.target.value)}
            min="0"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Bathrooms *
          </label>
          <Input
            type="number"
            value={form.bathrooms}
            onChange={(e) => update('bathrooms', e.target.value)}
            step="0.5"
            min="0"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Sqft
          </label>
          <Input
            type="number"
            placeholder="950"
            value={form.sqft}
            onChange={(e) => update('sqft', e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Monthly Rent ($) *
        </label>
        <Input
          type="number"
          placeholder="2800.00"
          value={form.rentAmountCents}
          onChange={(e) => update('rentAmountCents', e.target.value)}
          step="0.01"
          min="0"
          required
        />
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Unit'}
        </Button>
      </div>
    </form>
  );
}
