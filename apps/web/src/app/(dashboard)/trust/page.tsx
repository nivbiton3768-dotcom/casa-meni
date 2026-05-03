'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface Recon {
  trustAccounts: { id: string; name: string; currentBalanceCents: number }[];
  trustBalanceCents: number;
  heldDepositsCents: number;
  varianceCents: number;
  isReconciled: boolean;
}

interface Deposit {
  id: string;
  amountCents: number;
  status: string;
  receivedAt: string;
  refundedCents: number;
  lease: {
    tenant: { name: string };
    unit: { property: { name: string }; unitNumber: string };
  };
}

export default function TrustPage() {
  const { data: recon } = useApi<Recon>('/trust/reconciliation');
  const { data: deposits } = useApi<Deposit[]>('/trust/deposits');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trust Accounts"
        description="Compliance dashboard for security deposits in escrow."
      />

      <Card
        className={
          recon?.isReconciled ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'
        }
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            {recon?.isReconciled ? (
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            )}
            <div>
              <h2 className="text-xl font-bold">
                {recon?.isReconciled ? 'Reconciled' : 'Out of balance'}
              </h2>
              <div className="mt-2 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-gray-500">Trust account balance</div>
                  <div className="text-2xl font-bold">
                    ${((recon?.trustBalanceCents ?? 0) / 100).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Held deposits</div>
                  <div className="text-2xl font-bold">
                    ${((recon?.heldDepositsCents ?? 0) / 100).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Variance</div>
                  <div
                    className={`text-2xl font-bold ${(recon?.varianceCents ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    ${((recon?.varianceCents ?? 0) / 100).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Active deposits</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Tenant</th>
                <th>Property</th>
                <th>Received</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Refunded</th>
              </tr>
            </thead>
            <tbody>
              {deposits?.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="py-2">{d.lease?.tenant?.name ?? '—'}</td>
                  <td>
                    {d.lease?.unit?.property?.name ?? '—'}
                    {d.lease?.unit?.unitNumber ? ` #${d.lease.unit.unitNumber}` : ''}
                  </td>
                  <td>{new Date(d.receivedAt).toLocaleDateString()}</td>
                  <td>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs">
                      {d.status}
                    </span>
                  </td>
                  <td className="text-right">${(d.amountCents / 100).toFixed(2)}</td>
                  <td className="text-right">${(d.refundedCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
