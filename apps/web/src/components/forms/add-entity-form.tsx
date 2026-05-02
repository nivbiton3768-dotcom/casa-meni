'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

const ENTITY_TYPES = ['LLC', 'S-Corp', 'C-Corp', 'Partnership', 'Trust', 'Sole Proprietorship'];

interface AddEntityFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddEntityForm({ onSuccess, onCancel }: AddEntityFormProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', ein: '' });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/entities', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          ein: form.ein || undefined,
        }),
      });
      success('Entity created', `${form.name} (${form.type}) added.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not create entity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Entity Name *</label>
        <Input placeholder="Casa Meni Properties LLC" value={form.name} onChange={(e) => update('name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type *</label>
          <Select value={form.type} onChange={(e) => update('type', e.target.value)} required>
            <option value="">Select type...</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">EIN</label>
          <Input placeholder="XX-XXXXXXX" value={form.ein} onChange={(e) => update('ein', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Entity'}</Button>
      </div>
    </form>
  );
}
