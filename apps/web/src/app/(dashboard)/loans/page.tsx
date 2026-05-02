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
import { Banknote, Plus, FileText } from 'lucide-react';

interface Loan {
  id: string;
  type: string;
  lenderName: string;
  principalCents: number;
  rateBps: number;
  termMonths: number;
  monthlyPaymentCents: number;
  startDate: string;
  property: { name: string } | null;
}

interface Property {
  id: string;
  name: string;
}

export default function LoansPage() {
  const { data: loans, refetch } = useApi<Loan[]>('/loans');
  const { data: properties } = useApi<Property[]>('/properties');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    propertyId: '',
    lenderName: '',
    principalCents: 0,
    rateBps: 700,
    termMonths: 360,
    startDate: new Date().toISOString().slice(0, 10),
    type: 'MORTGAGE',
  });

  const create = async () => {
    try {
      await apiFetch('/loans', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Loan added');
      setOpen(false);
      refetch();
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loans & Mortgages"
        description="Track P&I, escrow, and amortization for every property."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add loan
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        {loans?.map((l) => (
          <Card key={l.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">{l.lenderName}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                  {l.type}
                </span>
              </div>
              {l.property && (
                <div className="text-sm text-gray-600">{l.property.name}</div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Principal</div>
                  <div className="font-bold">
                    ${(l.principalCents / 100).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Rate</div>
                  <div className="font-bold">{(l.rateBps / 100).toFixed(3)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Term</div>
                  <div className="font-bold">{l.termMonths} mo</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Monthly P&I</div>
                  <div className="font-bold">
                    ${(l.monthlyPaymentCents / 100).toFixed(2)}
                  </div>
                </div>
              </div>
              <a
                href={`/api/v1/loans/${l.id}/schedule`}
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                target="_blank"
                rel="noopener"
              >
                <FileText className="h-3 w-3" /> Amortization schedule (JSON)
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add loan">
        <div className="space-y-3">
          <Select
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
          >
            <option value="">No property</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="MORTGAGE">Mortgage</option>
            <option value="HELOC">HELOC</option>
            <option value="PRIVATE">Private</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input
            placeholder="Lender name"
            value={form.lenderName}
            onChange={(e) => setForm({ ...form, lenderName: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Principal ($)"
            onChange={(e) =>
              setForm({
                ...form,
                principalCents: Math.round(Number(e.target.value) * 100),
              })
            }
          />
          <Input
            type="number"
            step="0.001"
            placeholder="Rate (%)"
            onChange={(e) =>
              setForm({ ...form, rateBps: Math.round(Number(e.target.value) * 100) })
            }
          />
          <Input
            type="number"
            placeholder="Term (months)"
            value={form.termMonths}
            onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) })}
          />
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <Button onClick={create} className="w-full">
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
