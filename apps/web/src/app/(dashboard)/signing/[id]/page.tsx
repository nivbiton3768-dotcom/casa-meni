'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  XCircle,
  Copy,
  FileText,
} from 'lucide-react';

interface Signer {
  id: string;
  signerName: string;
  signerEmail: string;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED';
  signingToken: string;
  viewedAt: string | null;
  signedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  declineReason: string | null;
}

interface Envelope {
  id: string;
  title: string;
  message: string | null;
  sourceFileName: string;
  status: 'DRAFT' | 'SENT' | 'COMPLETED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  sentAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  signedFileHash: string | null;
  createdAt: string;
  signers: Signer[];
}

const statusConfig: Record<
  Envelope['status'],
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText },
  SENT: { label: 'Awaiting Signature', bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  COMPLETED: { label: 'Signed', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  DECLINED: { label: 'Declined', bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
  EXPIRED: { label: 'Expired', bg: 'bg-gray-50', text: 'text-gray-500', icon: Clock },
  CANCELLED: { label: 'Cancelled', bg: 'bg-gray-50', text: 'text-gray-500', icon: XCircle },
};

const signerStatusConfig: Record<
  Signer['status'],
  { label: string; bg: string; text: string; dot: string }
> = {
  PENDING: { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  VIEWED: { label: 'Viewed', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  SIGNED: { label: 'Signed', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  DECLINED: { label: 'Declined', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

export default function EnvelopeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: envelope, loading, refetch } = useApi<Envelope>(
    `/signing/envelopes/${id}`,
  );
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const copySigningLink = async (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      window.prompt('Copy this signing link:', url);
    }
  };

  const cancel = async () => {
    if (!envelope) return;
    if (!confirm('Cancel this envelope? Signers will no longer be able to sign.'))
      return;
    try {
      await apiFetch(`/signing/envelopes/${envelope.id}/cancel`, {
        method: 'PATCH',
      });
      toast.success('Envelope cancelled');
      refetch();
    } catch (err) {
      toast.error('Cancel failed', err instanceof Error ? err.message : '');
    }
  };

  const downloadSigned = async () => {
    if (!envelope) return;
    setDownloading(true);
    try {
      const res = await apiFetch<{ url: string; hash: string }>(
        `/signing/envelopes/${envelope.id}/signed-document`,
      );
      window.open(res.url, '_blank');
    } catch (err) {
      toast.error(
        'Download failed',
        err instanceof Error ? err.message : '',
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <Card>
          <CardContent className="p-6">
            <div className="h-32 animate-pulse rounded bg-gray-50" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!envelope) {
    return (
      <div>
        <p className="text-gray-500">Envelope not found.</p>
      </div>
    );
  }

  const cfg = statusConfig[envelope.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/signing"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            All envelopes
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900 md:text-2xl">
            {envelope.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{envelope.sourceFileName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {cfg.label}
          </span>
          {envelope.status === 'COMPLETED' && (
            <Button onClick={downloadSigned} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? 'Loading...' : 'Download Signed PDF'}
            </Button>
          )}
          {envelope.status === 'SENT' && (
            <Button variant="secondary" onClick={cancel}>
              Cancel Envelope
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Signers</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative ml-2 border-l-2 border-gray-100">
              {envelope.signers.map((s) => {
                const sCfg = signerStatusConfig[s.status];
                return (
                  <li key={s.id} className="relative mb-6 pl-6">
                    <span
                      className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full ring-4 ring-white ${sCfg.dot}`}
                    />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {s.signerName}
                        </p>
                        <p className="break-all text-xs text-gray-500">
                          {s.signerEmail}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${sCfg.bg} ${sCfg.text}`}
                      >
                        {sCfg.label}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-gray-500">
                      {s.viewedAt && (
                        <p>
                          Viewed{' '}
                          <span className="text-gray-700">
                            {new Date(s.viewedAt).toLocaleString()}
                          </span>
                        </p>
                      )}
                      {s.signedAt && (
                        <p>
                          Signed{' '}
                          <span className="text-gray-700">
                            {new Date(s.signedAt).toLocaleString()}
                          </span>
                        </p>
                      )}
                      {s.ipAddress && <p>IP: {s.ipAddress}</p>}
                      {s.userAgent && (
                        <p className="break-words">
                          UA:{' '}
                          <span className="text-gray-400">
                            {s.userAgent.slice(0, 80)}
                          </span>
                        </p>
                      )}
                      {s.declineReason && (
                        <p className="text-red-600">
                          Decline reason: {s.declineReason}
                        </p>
                      )}
                    </div>
                    {(s.status === 'PENDING' || s.status === 'VIEWED') &&
                      envelope.status === 'SENT' && (
                        <button
                          onClick={() => copySigningLink(s.signingToken)}
                          className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <Copy className="h-3 w-3" />
                          Copy signing link
                        </button>
                      )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Envelope Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="text-gray-900">
                  {new Date(envelope.createdAt).toLocaleString()}
                </dd>
              </div>
              {envelope.sentAt && (
                <div>
                  <dt className="text-xs text-gray-500">Sent</dt>
                  <dd className="text-gray-900">
                    {new Date(envelope.sentAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {envelope.completedAt && (
                <div>
                  <dt className="text-xs text-gray-500">Completed</dt>
                  <dd className="text-gray-900">
                    {new Date(envelope.completedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {envelope.expiresAt && (
                <div>
                  <dt className="text-xs text-gray-500">Expires</dt>
                  <dd className="text-gray-900">
                    {new Date(envelope.expiresAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {envelope.signedFileHash && (
                <div>
                  <dt className="text-xs text-gray-500">SHA-256 (signed)</dt>
                  <dd className="break-all font-mono text-[10px] text-gray-700">
                    {envelope.signedFileHash}
                  </dd>
                </div>
              )}
              {envelope.message && (
                <div>
                  <dt className="text-xs text-gray-500">Message</dt>
                  <dd className="whitespace-pre-wrap text-gray-700">
                    {envelope.message}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
