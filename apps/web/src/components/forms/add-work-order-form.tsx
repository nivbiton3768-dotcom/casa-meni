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
  units: { id: string; unitNumber: string }[];
}

interface PropertiesResponse {
  properties: Property[];
}

interface AddWorkOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddWorkOrderForm({ onSuccess, onCancel }: AddWorkOrderFormProps) {
  const { success, error: showError } = useToast();
  const { data: propData } = useApi<PropertiesResponse>('/properties?pageSize=100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    propertyId: '',
    unitId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selectedProperty = propData?.properties.find(
    (p) => p.id === form.propertyId,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: form.propertyId,
          unitId: form.unitId || undefined,
          title: form.title,
          description: form.description,
          priority: form.priority,
          category: form.category || undefined,
        }),
      });
      success('Work order created', 'The work order has been submitted.');
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create work order';
      setError(msg);
      showError('Failed to create work order', msg);
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
          Property *
        </label>
        <Select
          value={form.propertyId}
          onChange={(e) => {
            update('propertyId', e.target.value);
            update('unitId', '');
          }}
          required
        >
          <option value="">Select a property...</option>
          {propData?.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {selectedProperty && selectedProperty.units.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Unit (optional)
          </label>
          <Select
            value={form.unitId}
            onChange={(e) => update('unitId', e.target.value)}
          >
            <option value="">Whole property / common area</option>
            {selectedProperty.units.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unitNumber}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Title *
        </label>
        <Input
          placeholder="e.g. Leaking kitchen faucet"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description *
        </label>
        <Textarea
          placeholder="Describe the issue in detail..."
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          required
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Priority
          </label>
          <Select
            value={form.priority}
            onChange={(e) => update('priority', e.target.value)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="EMERGENCY">Emergency</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Category
          </label>
          <Select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            <option value="">Select...</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="hvac">HVAC</option>
            <option value="appliance">Appliance</option>
            <option value="general">General</option>
            <option value="pest_control">Pest Control</option>
            <option value="landscaping">Landscaping</option>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Work Order'}
        </Button>
      </div>
    </form>
  );
}
