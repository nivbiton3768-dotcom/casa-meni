'use client';

import { useState, FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface VacantUnit {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: string;
  rentAmountCents: number;
  property: { id: string; name: string };
}

interface TransferLeaseFormProps {
  leaseId: string;
  tenantName: string;
  currentRentCents: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransferLeaseForm({
  leaseId,
  tenantName,
  currentRentCents,
  onSuccess,
  onCancel,
}: TransferLeaseFormProps) {
  const toast = useToast();
  const { data: vacantUnits } = useApi<VacantUnit[]>('/leases/vacant-units');
  const [loading, setLoading] = useState(false);
  const [newUnitId, setNewUnitId] = useState('');
  const [rentAmount, setRentAmount] = useState(
    (currentRentCents / 100).toFixed(2),
  );

  const handleUnitChange = (unitId: string) => {
    setNewUnitId(unitId);
    const unit = vacantUnits?.find((u) => u.id === unitId);
    if (unit) setRentAmount((unit.rentAmountCents / 100).toFixed(2));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUnitId) {
      toast.error('Pick a unit to move to');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/leases/${leaseId}/transfer`, {
        method: 'PATCH',
        body: JSON.stringify({
          newUnitId,
          rentAmountCents: Math.round(parseFloat(rentAmount) * 100),
        }),
      });
      toast.success('Tenant moved', `${tenantName} was moved to the new unit.`);
      onSuccess();
    } catch (err) {
      toast.error('Transfer failed', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        Move <span className="font-medium">{tenantName}</span> to a different
        vacant unit. The lease and its payment history are kept; the old unit
        becomes vacant.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Move to unit *
        </label>
        <Select
          value={newUnitId}
          onChange={(e) => handleUnitChange(e.target.value)}
          required
        >
          <option value="">Select a vacant unit…</option>
          {vacantUnits?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.property.name} — Unit {u.unitNumber} ({u.bedrooms}bd/
              {u.bathrooms}ba, ${(u.rentAmountCents / 100).toLocaleString()}/mo)
            </option>
          ))}
        </Select>
        {vacantUnits?.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">
            No vacant units available to move into.
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Monthly Rent ($)
        </label>
        <Input
          type="number"
          value={rentAmount}
          onChange={(e) => setRentAmount(e.target.value)}
          step="0.01"
          min="1"
          required
        />
        <p className="mt-1 text-xs text-gray-400">
          Future unpaid rent will be updated to this amount.
        </p>
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !newUnitId}>
          {loading ? 'Moving…' : 'Move tenant'}
        </Button>
      </div>
    </form>
  );
}
