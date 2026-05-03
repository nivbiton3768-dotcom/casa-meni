'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useProperties } from '@/hooks/use-properties';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Plus, Boxes, AlertTriangle } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyExpires: string | null;
  propertyId: string;
}

const TYPES = [
  'HVAC',
  'WATER_HEATER',
  'REFRIGERATOR',
  'STOVE',
  'DISHWASHER',
  'WASHER',
  'DRYER',
  'ROOF',
  'WINDOWS',
  'PLUMBING',
  'ELECTRICAL',
  'SMART_LOCK',
  'OTHER',
];

export default function AssetsPage() {
  const { data: assets, refetch } = useApi<Asset[]>('/assets');
  const { data: warnings } = useApi<Asset[]>('/assets/warranty-alerts');
  const { properties } = useProperties();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    propertyId: string;
    type: string;
    name: string;
    brand: string;
    modelNumber: string;
    serialNumber: string;
    purchaseDate: string;
    warrantyExpires: string;
  }>({
    propertyId: '',
    type: 'HVAC',
    name: '',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyExpires: '',
  });

  const create = async () => {
    try {
      await apiFetch('/assets', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Asset added');
      setOpen(false);
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Track HVAC units, appliances, fixtures with warranty info and service history."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add asset
          </Button>
        }
      />

      {!!warnings?.length && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-900">
                  {warnings.length} warranties expiring within 60 days
                </h3>
                <ul className="mt-2 text-sm space-y-1">
                  {warnings.map((a) => (
                    <li key={a.id}>
                      {a.name} ({a.brand}) — expires{' '}
                      {a.warrantyExpires
                        ? new Date(a.warrantyExpires).toLocaleDateString()
                        : '?'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {assets?.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">{a.name}</span>
              </div>
              <div className="text-xs text-gray-500">
                {a.type} {a.brand && `· ${a.brand}`}
              </div>
              {a.modelNumber && (
                <div className="text-xs">Model: {a.modelNumber}</div>
              )}
              {a.serialNumber && (
                <div className="text-xs font-mono">SN: {a.serialNumber}</div>
              )}
              {a.warrantyExpires && (
                <div className="text-xs text-gray-500">
                  Warranty: {new Date(a.warrantyExpires).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add asset">
        <div className="space-y-3">
          <Select
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
          >
            <option value="">Select property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Name (e.g., Master bath HVAC)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Brand"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <Input
            placeholder="Model number"
            value={form.modelNumber}
            onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
          />
          <Input
            placeholder="Serial number"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
          <Input
            type="date"
            placeholder="Purchase date"
            value={form.purchaseDate}
            onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
          />
          <Input
            type="date"
            placeholder="Warranty expires"
            value={form.warrantyExpires}
            onChange={(e) => setForm({ ...form, warrantyExpires: e.target.value })}
          />
          <Button onClick={create} className="w-full" disabled={!form.propertyId || !form.name}>
            Add
          </Button>
        </div>
      </Modal>
    </div>
  );
}
