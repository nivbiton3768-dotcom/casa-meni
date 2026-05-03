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
import { Plus, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  cadence: string;
  cadenceDays: number | null;
  nextDueAt: string;
  lastCompletedAt: string | null;
  isActive: boolean;
}

export default function PreventivePage() {
  const { data: tasks, refetch } = useApi<Task[]>('/preventive');
  const { properties } = useProperties();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    propertyId: '',
    title: '',
    description: '',
    cadence: 'QUARTERLY',
    cadenceDays: 90,
    nextDueAt: new Date().toISOString().slice(0, 10),
  });

  const create = async () => {
    try {
      await apiFetch('/preventive', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Task created');
      setOpen(false);
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  const complete = async (id: string) => {
    await apiFetch(`/preventive/${id}/complete`, { method: 'POST' });
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preventive Maintenance"
        description="Recurring service tasks — Casa Meni auto-creates work orders when due."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New task
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {tasks?.map((t) => {
          const overdue = new Date(t.nextDueAt) < new Date();
          return (
            <Card
              key={t.id}
              className={overdue ? 'border-l-4 border-l-red-500' : ''}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      {t.title}
                    </div>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </div>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {t.cadence}
                  </span>
                </div>
                <div className="text-sm">
                  Next due: <strong>{new Date(t.nextDueAt).toLocaleDateString()}</strong>
                  {overdue && <span className="ml-2 text-red-600 font-bold">OVERDUE</span>}
                </div>
                <Button size="sm" variant="secondary" onClick={() => complete(t.id)}>
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Mark complete
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New preventive task">
        <div className="space-y-3">
          <Select
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Title (e.g., Change HVAC filter)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            value={form.cadence}
            onChange={(e) => setForm({ ...form, cadence: e.target.value })}
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="SEMI_ANNUAL">Semi-annual</option>
            <option value="ANNUAL">Annual</option>
            <option value="CUSTOM_DAYS">Custom (days)</option>
          </Select>
          {form.cadence === 'CUSTOM_DAYS' && (
            <Input
              type="number"
              placeholder="Days between"
              value={form.cadenceDays}
              onChange={(e) =>
                setForm({ ...form, cadenceDays: Number(e.target.value) })
              }
            />
          )}
          <Input
            type="date"
            value={form.nextDueAt}
            onChange={(e) => setForm({ ...form, nextDueAt: e.target.value })}
          />
          <Button onClick={create} className="w-full">
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
