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
import { Plus, ArrowRight, TrendingUp } from 'lucide-react';

type DealStage =
  | 'LEAD'
  | 'ANALYSIS'
  | 'UNDER_CONTRACT'
  | 'DUE_DILIGENCE'
  | 'CLOSING'
  | 'WON'
  | 'LOST';

interface Deal {
  id: string;
  name: string;
  stage: DealStage;
  address: string | null;
  city: string | null;
  state: string | null;
  askPriceCents: number | null;
  offerPriceCents: number | null;
  capRateBps: number | null;
  cashOnCashBps: number | null;
  aiScore: number | null;
  estimatedRehabCents: number | null;
  estimatedRentCents: number | null;
}

const STAGES: DealStage[] = [
  'LEAD',
  'ANALYSIS',
  'UNDER_CONTRACT',
  'DUE_DILIGENCE',
  'CLOSING',
  'WON',
  'LOST',
];

const STAGE_LABELS: Record<DealStage, string> = {
  LEAD: 'Lead',
  ANALYSIS: 'Analysis',
  UNDER_CONTRACT: 'Under Contract',
  DUE_DILIGENCE: 'Diligence',
  CLOSING: 'Closing',
  WON: 'Won',
  LOST: 'Lost',
};

const STAGE_COLORS: Record<DealStage, string> = {
  LEAD: 'border-gray-300 bg-gray-50',
  ANALYSIS: 'border-yellow-300 bg-yellow-50',
  UNDER_CONTRACT: 'border-blue-300 bg-blue-50',
  DUE_DILIGENCE: 'border-purple-300 bg-purple-50',
  CLOSING: 'border-orange-300 bg-orange-50',
  WON: 'border-emerald-300 bg-emerald-50',
  LOST: 'border-red-300 bg-red-50',
};

export default function DealsPage() {
  const { data: deals, refetch, loading } = useApi<Deal[]>('/deals');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    askPriceCents: 0,
    estimatedRentCents: 0,
    estimatedExpensesCents: 0,
    estimatedRehabCents: 0,
  });

  const create = async () => {
    try {
      await apiFetch('/deals', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Deal created');
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error('Create failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const move = async (id: string, stage: DealStage) => {
    try {
      await apiFetch(`/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      refetch();
    } catch {
      toast.error('Move failed');
    }
  };

  const grouped: Record<DealStage, Deal[]> = STAGES.reduce(
    (acc, s) => ({ ...acc, [s]: [] }),
    {} as Record<DealStage, Deal[]>,
  );
  (deals ?? []).forEach((d) => {
    grouped[d.stage]?.push(d);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal Pipeline"
        description="Track acquisitions and dispositions through every stage."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Deal
          </Button>
        }
      />

      <div className="grid gap-4 overflow-x-auto pb-4 lg:grid-cols-7">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[260px]">
            <div className={`rounded-t-lg border-2 px-3 py-2 ${STAGE_COLORS[stage]}`}>
              <h3 className="text-sm font-semibold uppercase">
                {STAGE_LABELS[stage]} · {grouped[stage].length}
              </h3>
            </div>
            <div className="space-y-2 rounded-b-lg border-x-2 border-b-2 border-gray-200 bg-white p-2 min-h-[200px]">
              {grouped[stage].map((d) => (
                <Card key={d.id} className="hover:shadow-md transition">
                  <CardContent className="p-3 space-y-2">
                    <div className="font-semibold text-sm">{d.name}</div>
                    {d.address && (
                      <div className="text-xs text-gray-500">
                        {d.address}, {d.city}, {d.state}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      {d.aiScore != null && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 font-bold">
                          {d.aiScore}/100
                        </span>
                      )}
                      {d.capRateBps != null && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
                          {(d.capRateBps / 100).toFixed(2)}% cap
                        </span>
                      )}
                      {d.cashOnCashBps != null && (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-700">
                          {(d.cashOnCashBps / 100).toFixed(2)}% CoC
                        </span>
                      )}
                    </div>
                    {(d.askPriceCents || d.offerPriceCents) && (
                      <div className="text-xs">
                        {d.offerPriceCents
                          ? `Offer: $${(d.offerPriceCents / 100).toLocaleString()}`
                          : `Ask: $${((d.askPriceCents ?? 0) / 100).toLocaleString()}`}
                      </div>
                    )}
                    <div className="flex gap-1 pt-1">
                      <Select
                        value={d.stage}
                        onChange={(e) => move(d.id, e.target.value as DealStage)}
                        className="text-xs flex-1"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {grouped[stage].length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">No deals</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New deal">
        <div className="space-y-3">
          <Input
            placeholder="Deal name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <Input
              placeholder="ZIP"
              value={form.zip}
              onChange={(e) => setForm({ ...form, zip: e.target.value })}
            />
          </div>
          <Input
            type="number"
            placeholder="Ask price ($)"
            onChange={(e) =>
              setForm({ ...form, askPriceCents: Math.round(Number(e.target.value) * 100) })
            }
          />
          <Input
            type="number"
            placeholder="Estimated monthly rent ($)"
            onChange={(e) =>
              setForm({
                ...form,
                estimatedRentCents: Math.round(Number(e.target.value) * 100),
              })
            }
          />
          <Input
            type="number"
            placeholder="Estimated monthly expenses ($)"
            onChange={(e) =>
              setForm({
                ...form,
                estimatedExpensesCents: Math.round(Number(e.target.value) * 100),
              })
            }
          />
          <Input
            type="number"
            placeholder="Estimated rehab ($)"
            onChange={(e) =>
              setForm({
                ...form,
                estimatedRehabCents: Math.round(Number(e.target.value) * 100),
              })
            }
          />
          <Button onClick={create} className="w-full">
            <TrendingUp className="mr-2 h-4 w-4" /> Create + auto-score
          </Button>
        </div>
      </Modal>
    </div>
  );
}
