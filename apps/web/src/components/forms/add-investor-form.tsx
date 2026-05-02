'use client';

import { useState, FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface Entity {
  id: string;
  name: string;
  type: string;
}

interface AddInvestorFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddInvestorForm({ onSuccess, onCancel }: AddInvestorFormProps) {
  const { success, error: showError } = useToast();
  const { data: entities } = useApi<Entity[]>('/entities');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    ownershipPct: '',
    entityId: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/investors', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          ownershipPct: parseFloat(form.ownershipPct),
          entityId: form.entityId || undefined,
        }),
      });
      success('Investor added', `${form.name} added with ${form.ownershipPct}% ownership.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not add investor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <Input placeholder="John Smith" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
          <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <Input placeholder="(305) 555-0199" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Ownership % *</label>
          <Input type="number" placeholder="25.00" step="0.01" min="0.01" max="100" value={form.ownershipPct} onChange={(e) => update('ownershipPct', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Entity / LLC</label>
        <Select value={form.entityId} onChange={(e) => update('entityId', e.target.value)}>
          <option value="">No entity (direct)</option>
          {entities?.map((e) => (
            <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Investor'}</Button>
      </div>
    </form>
  );
}
