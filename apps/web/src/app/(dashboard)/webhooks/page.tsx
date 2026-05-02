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
import { Plus, Trash2, Eye, EyeOff, Webhook } from 'lucide-react';

interface Sub {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  failureCount: number;
  lastDeliveryAt: string | null;
}

export default function WebhooksPage() {
  const { data: subs, refetch } = useApi<Sub[]>('/webhooks');
  const { data: events } = useApi<string[]>('/webhooks/events');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<{ url: string; events: string[] }>({
    url: '',
    events: [],
  });

  const create = async () => {
    try {
      await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Webhook created');
      setOpen(false);
      setForm({ url: '', events: [] });
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  const remove = async (id: string) => {
    await apiFetch(`/webhooks/${id}`, { method: 'DELETE' });
    refetch();
  };

  const toggle = async (sub: Sub) => {
    await apiFetch(`/webhooks/${sub.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !sub.isActive }),
    });
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Receive real-time HTTP callbacks for events in your account."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New webhook
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 text-sm">
          <p className="text-gray-600">
            Each delivery includes <code className="bg-gray-100 rounded px-1">X-Casa-Meni-Signature</code>{' '}
            (HMAC-SHA256 of the body using your webhook secret) and{' '}
            <code className="bg-gray-100 rounded px-1">X-Casa-Meni-Event</code>.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {subs?.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-mono text-sm">{s.url}</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {s.isActive ? 'Active' : 'Disabled'}
                  </span>
                  {s.failureCount > 0 && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      {s.failureCount} failures
                    </span>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => toggle(s)}>
                    {s.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {s.events.map((e) => (
                  <span key={e} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {e}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <strong>Secret:</strong>
                <code className="bg-gray-100 px-2 py-0.5 rounded">
                  {reveal[s.id] ? s.secret : '••••••••••••'}
                </code>
                <button
                  onClick={() => setReveal({ ...reveal, [s.id]: !reveal[s.id] })}
                >
                  {reveal[s.id] ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </button>
                {s.lastDeliveryAt && (
                  <span className="ml-auto text-gray-500">
                    Last: {new Date(s.lastDeliveryAt).toLocaleString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!subs?.length && (
          <Card>
            <CardContent className="p-8 text-center">
              <Webhook className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No webhooks yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New webhook">
        <div className="space-y-3">
          <Input
            placeholder="https://your-app.com/webhooks/casa-meni"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <div className="space-y-1">
            <div className="text-sm font-medium">Events to subscribe to:</div>
            <div className="grid grid-cols-2 gap-1">
              {events?.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        events: e.target.checked
                          ? [...form.events, ev]
                          : form.events.filter((x) => x !== ev),
                      })
                    }
                  />
                  <code className="text-xs">{ev}</code>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={create} disabled={!form.url || form.events.length === 0}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
