'use client';

import { useState, FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  address: string;
}

interface AddRenovationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddRenovationForm({ onSuccess, onCancel }: AddRenovationFormProps) {
  const { success, error: showError } = useToast();
  const { data: properties } = useApi<Property[]>('/properties');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    propertyId: '',
    name: '',
    budget: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/renovations', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: form.propertyId,
          name: form.name,
          budgetCents: Math.round(parseFloat(form.budget) * 100),
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          notes: form.notes || undefined,
        }),
      });
      success('Renovation created', `"${form.name}" project started.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not create renovation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Property *</label>
        <Select value={form.propertyId} onChange={(e) => update('propertyId', e.target.value)} required>
          <option value="">Select property...</option>
          {properties?.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Project Name *</label>
        <Input placeholder="Kitchen remodel, Bathroom renovation..." value={form.name} onChange={(e) => update('name', e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Budget ($) *</label>
        <Input type="number" placeholder="25000.00" step="0.01" min="1" value={form.budget} onChange={(e) => update('budget', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
          <Input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
          <Input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <Textarea placeholder="Scope of work, materials, special instructions..." value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Renovation'}</Button>
      </div>
    </form>
  );
}
