'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { SendForSignatureForm } from '@/components/forms/send-for-signature-form';
import {
  PenLine,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Eye,
} from 'lucide-react';

interface Signer {
  id: string;
  signerName: string;
  signerEmail: string;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED';
  signedAt: string | null;
  signingToken: string;
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
  { label: string; bg: string; text: string }
> = {
  PENDING: { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-600' },
  VIEWED: { label: 'Viewed', bg: 'bg-blue-50', text: 'text-blue-700' },
  SIGNED: { label: 'Signed', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  DECLINED: { label: 'Declined', bg: 'bg-red-50', text: 'text-red-600' },
};

export default function SigningPage() {
  const { data: envelopes, loading, refetch } =
    useApi<Envelope[]>('/signing/envelopes');
  const [showSend, setShowSend] = useState(false);
  const toast = useToast();

  const copySigningLink = async (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', 'Send it to the signer');
    } catch {
      window.prompt('Copy this signing link:', url);
    }
  };

  const cancelEnvelope = async (id: string) => {
    if (!confirm('Cancel this envelope? Signers will no longer be able to sign.'))
      return;
    try {
      await apiFetch(`/signing/envelopes/${id}/cancel`, { method: 'PATCH' });
      toast.success('Envelope cancelled');
      refetch();
    } catch (err) {
      toast.error('Cancel failed', err instanceof Error ? err.message : '');
    }
  };

  const stats = envelopes
    ? {
        total: envelopes.length,
        pending: envelopes.filter((e) => e.status === 'SENT').length,
        completed: envelopes.filter((e) => e.status === 'COMPLETED').length,
        declined: envelopes.filter((e) => e.status === 'DECLINED').length,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Signatures"
        description={
          envelopes
            ? `${envelopes.length} envelope${envelopes.length === 1 ? '' : 's'}`
            : 'Loading...'
        }
        actions={
          <Button onClick={() => setShowSend(true)}>
            <Send className="mr-2 h-4 w-4" />
            Send for Signature
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-amber-600">Awaiting</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {stats.pending}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-emerald-600">Signed</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {stats.completed}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-red-600">Declined</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {stats.declined}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !envelopes || envelopes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-blue-50 p-4">
              <PenLine className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No e-signatures yet
            </h3>
            <p className="mt-1 max-w-md text-center text-sm text-gray-500">
              Send leases, renewals, or any document for legally-binding electronic
              signature. Signers get a private link, sign on any device, and you
              receive the completed PDF with a tamper-evident audit trail.
            </p>
            <Button className="mt-6" onClick={() => setShowSend(true)}>
              <Send className="mr-2 h-4 w-4" />
              Send Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {envelopes.map((env) => {
            const cfg = statusConfig[env.status];
            const StatusIcon = cfg.icon;
            return (
              <Card key={env.id}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/signing/${env.id}`}
                          className="text-base font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {env.title}
                        </Link>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {env.sourceFileName} · Sent{' '}
                        {env.sentAt
                          ? new Date(env.sentAt).toLocaleDateString()
                          : 'not sent'}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {env.signers.map((s) => {
                          const sCfg = signerStatusConfig[s.status];
                          return (
                            <div
                              key={s.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {s.signerName}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                  {s.signerEmail}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${sCfg.bg} ${sCfg.text}`}
                                >
                                  {sCfg.label}
                                </span>
                                {(s.status === 'PENDING' ||
                                  s.status === 'VIEWED') &&
                                  env.status === 'SENT' && (
                                    <button
                                      onClick={() =>
                                        copySigningLink(s.signingToken)
                                      }
                                      className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                    >
                                      Copy Link
                                    </button>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 md:flex-col">
                      <Link
                        href={`/signing/${env.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 md:flex-none"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Link>
                      {env.status === 'SENT' && (
                        <button
                          onClick={() => cancelEnvelope(env.id)}
                          className="inline-flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 md:flex-none"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="Send for Signature"
        size="lg"
      >
        <SendForSignatureForm
          onSuccess={() => {
            setShowSend(false);
            refetch();
          }}
          onCancel={() => setShowSend(false)}
        />
      </Modal>
    </div>
  );
}
