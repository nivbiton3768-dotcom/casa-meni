'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { KeyRound, Plus, Trash2 } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  type: string;
  smartLockProvider: string | null;
}

interface Code {
  id: string;
  code: string;
  validFrom: string;
  validUntil: string;
  guestName: string | null;
  status: string;
}

export default function SmartLocksPage() {
  const { data: assets } = useApi<Asset[]>('/assets?type=SMART_LOCK');
  const [selected, setSelected] = useState<string>('');
  const { data: codes, refetch } = useApi<Code[]>(
    selected ? `/smart-locks/asset/${selected}/codes` : null,
  );
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    guestName: '',
    validFrom: '',
    validUntil: '',
    emailTo: '',
  });

  const issue = async () => {
    if (!selected) return;
    try {
      await apiFetch(`/smart-locks/asset/${selected}/codes`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Code issued');
      setOpen(false);
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  const revoke = async (id: string) => {
    await apiFetch(`/smart-locks/codes/${id}`, { method: 'DELETE' });
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Locks"
        description="Issue temporary access codes for guests, contractors, and tenants."
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select smart lock…</option>
            {assets?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.smartLockProvider && `(${a.smartLockProvider})`}
              </option>
            ))}
          </Select>
          {selected && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Issue code
            </Button>
          )}
        </CardContent>
      </Card>

      {selected && codes && (
        <div className="space-y-3">
          {codes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-2xl font-bold tracking-widest">
                    {c.code}
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.guestName && `${c.guestName} · `}
                    {new Date(c.validFrom).toLocaleString()} →{' '}
                    {new Date(c.validUntil).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {c.status}
                  </span>
                  {c.status === 'ACTIVE' && (
                    <Button size="sm" variant="ghost" onClick={() => revoke(c.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Issue code">
        <div className="space-y-3">
          <Input
            placeholder="Guest name"
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
          />
          <Input
            type="datetime-local"
            value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
          />
          <Input
            type="datetime-local"
            value={form.validUntil}
            onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
          />
          <Input
            placeholder="Email to (optional)"
            value={form.emailTo}
            onChange={(e) => setForm({ ...form, emailTo: e.target.value })}
          />
          <Button onClick={issue} className="w-full">
            <KeyRound className="mr-2 h-4 w-4" /> Issue
          </Button>
        </div>
      </Modal>
    </div>
  );
}
