'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface EditTenantFormProps {
  tenant: { id: string; name: string; email: string; phone?: string | null };
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditTenantForm({
  tenant,
  onSuccess,
  onCancel,
}: EditTenantFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: tenant.name,
    email: tenant.email,
    phone: tenant.phone ?? '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/leases/tenants/${tenant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
        }),
      });
      toast.success('Tenant updated');
      onSuccess();
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Full name
        </label>
        <Input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <Input
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="(305) 555-0100"
        />
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
