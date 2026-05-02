'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiFetch, formatCents } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface Payment {
  id: string;
  amountCents: number;
  dueDate: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
}

interface Props {
  txnId: string;
  txnAmountCents: number;
  payments: Payment[];
  onMatched?: () => void;
}

export function MatchTransactionPicker({
  txnId,
  txnAmountCents,
  payments,
  onMatched,
}: Props) {
  const [paymentId, setPaymentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleMatch = async () => {
    if (!paymentId) {
      toast.error('Pick a payment first');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/banking/transactions/${txnId}/match`, {
        method: 'POST',
        body: JSON.stringify({ paymentId }),
      });
      toast.success('Matched');
      onMatched?.();
    } catch (err) {
      toast.error('Match failed', err instanceof Error ? err.message : '');
    } finally {
      setSubmitting(false);
    }
  };

  // Sort payments: closest amount first, then ones with similar amounts to txn
  const sorted = [...payments].sort(
    (a, b) =>
      Math.abs(a.amountCents - txnAmountCents) -
      Math.abs(b.amountCents - txnAmountCents),
  );

  if (sorted.length === 0) {
    return (
      <span className="text-xs text-gray-500">No unpaid rents to match</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={paymentId}
        onChange={(e) => setPaymentId(e.target.value)}
        className="h-9 max-w-xs flex-1 text-xs"
      >
        <option value="">Match to a rent payment…</option>
        {sorted.map((p) => (
          <option key={p.id} value={p.id}>
            {p.tenantName} — {p.propertyName} #{p.unitNumber} —{' '}
            {formatCents(p.amountCents)} due{' '}
            {new Date(p.dueDate).toLocaleDateString()}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        onClick={handleMatch}
        disabled={!paymentId || submitting}
      >
        {submitting ? 'Matching…' : 'Match'}
      </Button>
    </div>
  );
}
