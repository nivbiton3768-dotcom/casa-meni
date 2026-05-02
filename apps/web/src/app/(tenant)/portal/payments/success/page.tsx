'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface SessionResult {
  payment: {
    id: string;
    amountCents: number;
    status: string;
    paidAt: string | null;
    receiptUrl: string | null;
    propertyName: string;
    unitNumber: string;
    dueDate: string;
  };
}

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-10">
          <Card>
            <CardContent className="flex flex-col items-center p-8 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  );
}

function PaymentSuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [data, setData] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session ID');
      setPolling(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 12; // ~24s total

    const poll = async () => {
      try {
        const res = await apiFetch<SessionResult>(
          `/payments/session/${sessionId}`,
        );
        setData(res);
        if (res.payment.paidAt || res.payment.status === 'PAID') {
          setPolling(false);
          return;
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          setError(err instanceof Error ? err.message : 'Could not verify');
          setPolling(false);
          return;
        }
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setPolling(false);
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
  }, [sessionId]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Card className="border-red-100">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">
              Could not verify payment
            </h1>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Link
              href="/portal/payments"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to payments
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || polling) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Card>
          <CardContent className="flex flex-col items-center p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">
              Processing your payment...
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              This usually takes a few seconds. Please don&apos;t close this
              window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = data.payment.status === 'PAID' || data.payment.paidAt;

  return (
    <div className="mx-auto max-w-md py-10">
      <Card className={isPaid ? 'border-emerald-100' : 'border-amber-100'}>
        <CardContent className="flex flex-col items-center p-8 text-center">
          {isPaid ? (
            <div className="rounded-full bg-emerald-50 p-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
          ) : (
            <div className="rounded-full bg-amber-50 p-3">
              <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
            </div>
          )}
          <h1 className="mt-5 text-xl font-bold text-gray-900">
            {isPaid ? 'Payment Received!' : 'Almost there...'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isPaid
              ? `Thank you. We received ${fmt(data.payment.amountCents)} for ${data.payment.propertyName} Unit ${data.payment.unitNumber}.`
              : `Your payment for ${fmt(data.payment.amountCents)} is still being confirmed by your bank. This page will refresh once it clears.`}
          </p>
          <div className="mt-6 flex w-full flex-col gap-2">
            {data.payment.receiptUrl && (
              <a
                href={data.payment.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Download Receipt
              </a>
            )}
            <Link
              href="/portal/payments"
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Payments
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
