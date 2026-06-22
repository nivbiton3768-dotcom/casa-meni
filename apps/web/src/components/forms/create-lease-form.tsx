'use client';

import { useEffect, useState, FormEvent } from 'react';
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

interface Tenant {
  id: string;
  name: string;
  email: string;
}

interface CreateLeaseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  /** When set, only this property's vacant units are selectable. */
  propertyId?: string;
  /** Pre-select a specific unit (e.g. when adding a tenant to one unit). */
  defaultUnitId?: string;
}

export function CreateLeaseForm({
  onSuccess,
  onCancel,
  propertyId,
  defaultUnitId,
}: CreateLeaseFormProps) {
  const { success, error: showError } = useToast();
  const { data: allVacantUnits } = useApi<VacantUnit[]>('/leases/vacant-units');
  const { data: tenants } = useApi<Tenant[]>('/leases/tenants');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenantMode, setTenantMode] = useState<'existing' | 'new'>('new');
  const [form, setForm] = useState({
    unitId: '',
    tenantId: '',
    tenantName: '',
    tenantEmail: '',
    startDate: '',
    endDate: '',
    rentAmount: '',
    depositAmount: '',
  });

  const vacantUnits = propertyId
    ? allVacantUnits?.filter((u) => u.property.id === propertyId)
    : allVacantUnits;

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selectedUnit = vacantUnits?.find((u) => u.id === form.unitId);

  useEffect(() => {
    if (defaultUnitId && !form.unitId && allVacantUnits) {
      const unit = allVacantUnits.find((u) => u.id === defaultUnitId);
      if (unit) {
        setForm((prev) => ({
          ...prev,
          unitId: unit.id,
          rentAmount: (unit.rentAmountCents / 100).toFixed(2),
          depositAmount: (unit.rentAmountCents / 100).toFixed(2),
        }));
      }
    }
  }, [defaultUnitId, allVacantUnits, form.unitId]);

  const handleUnitChange = (unitId: string) => {
    update('unitId', unitId);
    const unit = vacantUnits?.find((u) => u.id === unitId);
    if (unit) {
      update('rentAmount', (unit.rentAmountCents / 100).toFixed(2));
      update('depositAmount', (unit.rentAmountCents / 100).toFixed(2));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        unitId: form.unitId,
        startDate: form.startDate,
        endDate: form.endDate,
        rentAmountCents: Math.round(parseFloat(form.rentAmount) * 100),
        depositCents: Math.round(parseFloat(form.depositAmount) * 100),
      };

      if (tenantMode === 'existing') {
        body.tenantId = form.tenantId;
      } else {
        body.tenantName = form.tenantName;
        body.tenantEmail = form.tenantEmail;
      }

      const res = await apiFetch<{ data: { paymentsGenerated: number } }>(
        '/leases',
        { method: 'POST', body: JSON.stringify(body) },
      );

      success(
        'Lease created',
        `Lease activated with ${res.data.paymentsGenerated} monthly payments generated.`,
      );
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create lease';
      setError(msg);
      showError('Failed to create lease', msg);
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
          Unit *
        </label>
        <Select
          value={form.unitId}
          onChange={(e) => handleUnitChange(e.target.value)}
          required
        >
          <option value="">Select a vacant unit...</option>
          {vacantUnits?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.property.name} — Unit {u.unitNumber} ({u.bedrooms}bd/
              {u.bathrooms}ba, ${(u.rentAmountCents / 100).toLocaleString()}/mo)
            </option>
          ))}
        </Select>
        {vacantUnits?.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">
            No vacant units available. Mark a unit as vacant first.
          </p>
        )}
      </div>

      {/* Tenant selection */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Tenant
        </label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTenantMode('new')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              tenantMode === 'new'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            New Tenant
          </button>
          <button
            type="button"
            onClick={() => setTenantMode('existing')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              tenantMode === 'existing'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Existing Tenant
          </button>
        </div>

        {tenantMode === 'existing' ? (
          <Select
            value={form.tenantId}
            onChange={(e) => update('tenantId', e.target.value)}
            required
          >
            <option value="">Select a tenant...</option>
            {tenants?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </Select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                placeholder="Full name"
                value={form.tenantName}
                onChange={(e) => update('tenantName', e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={form.tenantEmail}
                onChange={(e) => update('tenantEmail', e.target.value)}
                required
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Start Date *
          </label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => update('startDate', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            End Date *
          </label>
          <Input
            type="date"
            value={form.endDate}
            onChange={(e) => update('endDate', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Monthly Rent ($) *
          </label>
          <Input
            type="number"
            placeholder="2800.00"
            value={form.rentAmount}
            onChange={(e) => update('rentAmount', e.target.value)}
            step="0.01"
            min="1"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Security Deposit ($) *
          </label>
          <Input
            type="number"
            placeholder="2800.00"
            value={form.depositAmount}
            onChange={(e) => update('depositAmount', e.target.value)}
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      {form.startDate && form.endDate && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          This lease will generate{' '}
          <strong>
            {Math.max(
              0,
              Math.ceil(
                (new Date(form.endDate).getTime() -
                  new Date(form.startDate).getTime()) /
                  (1000 * 60 * 60 * 24 * 30),
              ),
            )}
          </strong>{' '}
          monthly payment records.
        </div>
      )}

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Lease'}
        </Button>
      </div>
    </form>
  );
}
