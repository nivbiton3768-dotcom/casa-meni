'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { Plus, Send, Wallet } from 'lucide-react';

interface Investor {
  id: string;
  name: string;
  email: string;
}

interface Call {
  id: string;
  title: string;
  description: string | null;
  totalCents: number;
  dueDate: string;
  status: string;
  commitments: {
    id: string;
    amountCents: number;
    status: string;
    investor: { id: string; name: string; email: string };
  }[];
  property: { name: string } | null;
}

export default function CapitalCallsPage() {
  const { data: calls, refetch } = useApi<Call[]>('/capital-calls');
  const { data: investors } = useApi<Investor[]>('/users?role=INVESTOR');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    totalCents: 0,
    dueDate: '',
    commitments: [] as { investorUserId: string; amountCents: number }[],
  });

  const create = async () => {
    try {
      await apiFetch('/capital-calls', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Capital call drafted');
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed', err instanceof Error ? err.message : '');
    }
  };

  const send = async (id: string) => {
    await apiFetch(`/capital-calls/${id}/send`, { method: 'POST' });
    toast.success('Sent to investors');
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capital Calls"
        description="Raise capital from investors with deal package + tracked commitments."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New call
          </Button>
        }
      />

      <div className="space-y-3">
        {calls?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    {c.title}
                  </h3>
                  <p className="text-sm text-gray-500">{c.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    Total: ${(c.totalCents / 100).toLocaleString()} · Due:{' '}
                    {new Date(c.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs">
                    {c.status}
                  </span>
                  {c.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => send(c.id)}>
                      <Send className="mr-1 h-3 w-3" /> Send
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {c.commitments.map((cm) => (
                  <div
                    key={cm.id}
                    className="flex items-center justify-between text-sm border-t pt-2"
                  >
                    <div>{cm.investor.name}</div>
                    <div>${(cm.amountCents / 100).toLocaleString()}</div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${cm.status === 'FUNDED' ? 'bg-emerald-100 text-emerald-700' : cm.status === 'COMMITTED' ? 'bg-blue-100 text-blue-700' : cm.status === 'DECLINED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {cm.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New capital call">
        <div className="space-y-3">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Total amount ($)"
            onChange={(e) =>
              setForm({ ...form, totalCents: Math.round(Number(e.target.value) * 100) })
            }
          />
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div className="space-y-1">
            <div className="text-sm font-medium">Investor commitments:</div>
            {investors?.map((inv) => {
              const ex = form.commitments.find((c) => c.investorUserId === inv.id);
              return (
                <div key={inv.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{inv.name}</span>
                  <Input
                    type="number"
                    placeholder="Amount ($)"
                    className="w-32"
                    onChange={(e) => {
                      const val = Math.round(Number(e.target.value) * 100);
                      setForm({
                        ...form,
                        commitments: [
                          ...form.commitments.filter((c) => c.investorUserId !== inv.id),
                          ...(val > 0 ? [{ investorUserId: inv.id, amountCents: val }] : []),
                        ],
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
          <Button onClick={create} className="w-full">
            Create draft
          </Button>
        </div>
      </Modal>
    </div>
  );
}
