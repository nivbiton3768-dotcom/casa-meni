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

interface AddReservationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CHANNELS = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'vrbo', label: 'VRBO' },
  { value: 'booking', label: 'Booking.com' },
  { value: 'direct', label: 'Direct' },
];

export function AddReservationForm({ onSuccess, onCancel }: AddReservationFormProps) {
  const { success, error: showError } = useToast();
  const { data: properties } = useApi<Property[]>('/properties');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    propertyId: '',
    unitId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    channel: '',
    checkIn: '',
    checkOut: '',
    nightlyRate: '',
    totalAmount: '',
    cleaningFee: '',
    notes: '',
  });

  const selectedProperty = properties?.find((p) => p.id === form.propertyId);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePropertyChange = (value: string) => {
    setForm((prev) => ({ ...prev, propertyId: value, unitId: '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: form.propertyId,
          unitId: form.unitId,
          guestName: form.guestName,
          guestEmail: form.guestEmail || undefined,
          guestPhone: form.guestPhone || undefined,
          channel: form.channel || undefined,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          nightlyRateCents: Math.round(parseFloat(form.nightlyRate) * 100),
          totalCents: Math.round(parseFloat(form.totalAmount) * 100),
          cleaningFeeCents: form.cleaningFee
            ? Math.round(parseFloat(form.cleaningFee) * 100)
            : undefined,
          notes: form.notes || undefined,
        }),
      });
      success('Reservation created', `Booking for ${form.guestName} confirmed.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not create reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Property *</label>
          <Select value={form.propertyId} onChange={(e) => handlePropertyChange(e.target.value)} required>
            <option value="">Select property...</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Unit *</label>
          <Select
            value={form.unitId}
            onChange={(e) => update('unitId', e.target.value)}
            required
            disabled={!form.propertyId}
          >
            <option value="">Select unit...</option>
            {selectedProperty?.units?.map((u) => (
              <option key={u.id} value={u.id}>{u.unitNumber}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Guest Name *</label>
        <Input
          placeholder="John Doe"
          value={form.guestName}
          onChange={(e) => update('guestName', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <Input
            type="email"
            placeholder="guest@example.com"
            value={form.guestEmail}
            onChange={(e) => update('guestEmail', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <Input
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={form.guestPhone}
            onChange={(e) => update('guestPhone', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Channel</label>
        <Select value={form.channel} onChange={(e) => update('channel', e.target.value)}>
          <option value="">Select channel...</option>
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Check-in *</label>
          <Input
            type="date"
            value={form.checkIn}
            onChange={(e) => update('checkIn', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Check-out *</label>
          <Input
            type="date"
            value={form.checkOut}
            onChange={(e) => update('checkOut', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nightly Rate ($) *</label>
          <Input
            type="number"
            placeholder="150.00"
            step="0.01"
            min="0.01"
            value={form.nightlyRate}
            onChange={(e) => update('nightlyRate', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Total ($) *</label>
          <Input
            type="number"
            placeholder="750.00"
            step="0.01"
            min="0"
            value={form.totalAmount}
            onChange={(e) => update('totalAmount', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cleaning Fee ($)</label>
          <Input
            type="number"
            placeholder="100.00"
            step="0.01"
            min="0"
            value={form.cleaningFee}
            onChange={(e) => update('cleaningFee', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <Textarea
          placeholder="Late check-in, pet-friendly unit needed, etc."
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Reservation'}</Button>
      </div>
    </form>
  );
}
