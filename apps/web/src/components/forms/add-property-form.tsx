'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface AddPropertyFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddPropertyForm({ onSuccess, onCancel }: AddPropertyFormProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    type: 'LONG_TERM_RENTAL',
    purchasePrice: '',
    purchaseDate: '',
    currentValue: '',
    notes: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/properties', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          type: form.type,
          purchasePrice: form.purchasePrice
            ? Math.round(parseFloat(form.purchasePrice) * 100)
            : undefined,
          purchaseDate: form.purchaseDate || undefined,
          currentValue: form.currentValue
            ? Math.round(parseFloat(form.currentValue) * 100)
            : undefined,
          notes: form.notes || undefined,
        }),
      });
      success('Property created', 'Your new property has been added.');
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create property';
      setError(msg);
      showError('Failed to create property', msg);
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
          Property Name *
        </label>
        <Input
          placeholder="e.g. Brickell Apartments"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Property Type *
        </label>
        <Select
          value={form.type}
          onChange={(e) => update('type', e.target.value)}
        >
          <option value="LONG_TERM_RENTAL">Long-Term Rental</option>
          <option value="SHORT_TERM_RENTAL">Short-Term Rental</option>
          <option value="RENOVATION">Renovation</option>
          <option value="FOR_SALE">For Sale</option>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Address *
        </label>
        <Input
          placeholder="1250 SW 1st Ave"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            City *
          </label>
          <Input
            placeholder="Miami"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            State *
          </label>
          <Input
            placeholder="FL"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            required
            maxLength={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            ZIP *
          </label>
          <Input
            placeholder="33130"
            value={form.zip}
            onChange={(e) => update('zip', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Purchase Price ($)
          </label>
          <Input
            type="number"
            placeholder="850000"
            value={form.purchasePrice}
            onChange={(e) => update('purchasePrice', e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Purchase Date
          </label>
          <Input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => update('purchaseDate', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Current Value ($)
        </label>
        <Input
          type="number"
          placeholder="920000"
          value={form.currentValue}
          onChange={(e) => update('currentValue', e.target.value)}
          step="0.01"
          min="0"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <Textarea
          placeholder="Any additional notes about this property..."
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Property'}
        </Button>
      </div>
    </form>
  );
}
