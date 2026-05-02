'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface AddVendorFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const TRADES = [
  'General Contractor',
  'Plumber',
  'Electrician',
  'HVAC Technician',
  'Roofer',
  'Painter',
  'Flooring Installer',
  'Landscaper',
  'Handyman',
  'Appliance Repair',
  'Locksmith',
  'Pest Control',
  'Cleaning Service',
  'Other',
];

export function AddVendorForm({ onSuccess, onCancel }: AddVendorFormProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trade: '',
    email: '',
    phone: '',
    notes: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/vendors', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          trade: form.trade || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        }),
      });
      success('Vendor added', `${form.name} added to your vendor list.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not add vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <Input placeholder="ABC Plumbing" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Trade</label>
          <Select value={form.trade} onChange={(e) => update('trade', e.target.value)}>
            <option value="">Select trade...</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <Input type="email" placeholder="contact@vendor.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <Input placeholder="(305) 555-0123" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <Textarea placeholder="Specialties, availability, rates..." value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Vendor'}</Button>
      </div>
    </form>
  );
}
