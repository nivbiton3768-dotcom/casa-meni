'use client';

import { use, useEffect, useState } from 'react';
import { API_URL } from '@/lib/utils';
import { SignaturePad } from '@/components/signature-pad';
import {
  CheckCircle2,
  Building2,
  AlertCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface SigningData {
  envelope: {
    id: string;
    title: string;
    message: string | null;
    organizationName: string;
    sourceFileName: string;
    sourceFileUrl: string;
    status: string;
    expiresAt: string | null;
  };
  signer: {
    id: string;
    name: string;
    email: string;
    status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED';
    signedAt: string | null;
  };
}

async function publicFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Network error' } }));
    throw new Error(err.error?.message || 'Request failed');
  }
  return res.json();
}

export default function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<SigningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    publicFetch<{ data: SigningData }>(`/public/sign/${token}`)
      .then((res) => {
        setData(res.data);
        if (res.data.signer.status === 'SIGNED') {
          setSubmitted(true);
        }
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Could not load'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!signature) return;
    setSubmitting(true);
    try {
      await publicFetch(`/public/sign/${token}`, {
        method: 'POST',
        body: JSON.stringify({ signatureDataUrl: signature }),
      });
      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sign');
    } finally {
      setSubmitting(false);
    }
  };

  const decline = async () => {
    setSubmitting(true);
    try {
      await publicFetch(`/public/sign/${token}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason: declineReason }),
      });
      setData((d) =>
        d ? { ...d, signer: { ...d.signer, status: 'DECLINED' } } : d,
      );
      setShowDecline(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">
            Link unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {loadError || 'This signing link is invalid or has expired.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-gray-900">
            Document signed
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Thank you, {data.signer.name}. Your signature has been recorded for{' '}
            <strong className="text-gray-700">{data.envelope.title}</strong>.
            {data.envelope.organizationName} will receive a notification with the
            completed document.
          </p>
          <p className="mt-6 text-xs text-gray-400">
            You can close this page.
          </p>
        </div>
      </div>
    );
  }

  if (data.signer.status === 'DECLINED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">
            Declined to sign
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;ve recorded your decision and notified{' '}
            {data.envelope.organizationName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-6 w-6 shrink-0 text-blue-600" />
            <span className="truncate text-base font-bold text-gray-900">
              {data.envelope.organizationName}
            </span>
          </div>
          <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 md:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure E-Signature
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 py-4 md:py-6 lg:grid-cols-3 lg:gap-6 lg:px-6">
        <section className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="truncate text-sm font-medium text-gray-700">
                {data.envelope.sourceFileName}
              </span>
            </div>
            <iframe
              src={data.envelope.sourceFileUrl}
              title={data.envelope.title}
              className="h-[55vh] w-full md:h-[70vh]"
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Trouble viewing? Some browsers block inline PDFs.{' '}
            <a
              href={data.envelope.sourceFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              Open in new tab
            </a>
          </p>
        </section>

        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Signing as
            </p>
            <p className="mt-1 text-base font-semibold text-gray-900">
              {data.signer.name}
            </p>
            <p className="text-xs text-gray-500 break-all">{data.signer.email}</p>

            <h2 className="mt-4 text-sm font-semibold text-gray-900">
              {data.envelope.title}
            </h2>
            {data.envelope.message && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                {data.envelope.message}
              </p>
            )}
            {data.envelope.expiresAt && (
              <p className="mt-3 text-xs text-gray-400">
                Expires{' '}
                {new Date(data.envelope.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">
              Draw your signature
            </p>
            <div className="mt-3">
              <SignaturePad onChange={setSignature} />
            </div>

            <label className="mt-4 flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span>
                I agree this is my legally binding electronic signature with the
                same effect as a handwritten signature, and I have reviewed the
                document above.
              </span>
            </label>

            <button
              onClick={submit}
              disabled={!signature || !agreed || submitting}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {submitting ? 'Submitting...' : 'Sign Document'}
            </button>
            <button
              onClick={() => setShowDecline(true)}
              disabled={submitting}
              className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              Decline to sign
            </button>
          </div>

          <p className="px-2 text-center text-[11px] text-gray-400">
            We capture your IP address, device info, and timestamp as part of the
            audit trail.
          </p>
        </aside>
      </main>

      {showDecline && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setShowDecline(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Decline to sign?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              The sender will be notified. You won&apos;t be able to sign this
              document afterwards.
            </p>
            <textarea
              placeholder="Reason (optional)"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="mt-4 block w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="mt-4 flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
              <button
                onClick={() => setShowDecline(false)}
                disabled={submitting}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={decline}
                disabled={submitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {submitting ? 'Sending...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
