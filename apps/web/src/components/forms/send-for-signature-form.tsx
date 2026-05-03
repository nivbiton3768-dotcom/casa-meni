'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Trash2, Plus, FileUp, X } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  email: string;
}

interface Lease {
  id: string;
  tenant: { id: string; name: string; email: string };
  unit: {
    unitNumber: string;
    property: { id: string; name: string };
  };
}

interface Property {
  id: string;
  name: string;
}

interface Signer {
  name: string;
  email: string;
  userId?: string;
}

interface SendForSignatureFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_PDF_BYTES = 5 * 1024 * 1024;

export function SendForSignatureForm({
  onSuccess,
  onCancel,
}: SendForSignatureFormProps) {
  const { success, error: showError } = useToast();
  const { data: tenants } = useApi<Tenant[]>('/leases/tenants');
  const { data: leases } = useApi<Lease[]>('/leases');
  const { data: properties } = useApi<Property[]>('/properties');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState(
    'Please review and sign this document. By signing, you agree this is your legally binding electronic signature with the same effect as a handwritten signature.',
  );
  const [leaseId, setLeaseId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('14');
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState(0);
  const [signers, setSigners] = useState<Signer[]>([
    { name: '', email: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showError('Wrong file type', 'Please upload a PDF.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      showError('File too large', 'PDF must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPdfDataUrl(reader.result as string);
      setPdfName(file.name);
      setPdfSize(file.size);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, ''));
    };
    reader.readAsDataURL(file);
  };

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '' }]);
  };

  const removeSigner = (idx: number) => {
    setSigners(signers.filter((_, i) => i !== idx));
  };

  const updateSigner = (idx: number, patch: Partial<Signer>) => {
    setSigners(signers.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const pickTenant = (idx: number, tenantId: string) => {
    if (!tenantId) {
      updateSigner(idx, { userId: undefined });
      return;
    }
    const t = tenants?.find((x) => x.id === tenantId);
    if (t) {
      updateSigner(idx, { name: t.name, email: t.email, userId: t.id });
    }
  };

  const pickLease = (id: string) => {
    setLeaseId(id);
    if (!id) return;
    const l = leases?.find((x) => x.id === id);
    if (l) {
      if (signers.length === 1 && !signers[0].name && !signers[0].email) {
        setSigners([
          {
            name: l.tenant.name,
            email: l.tenant.email,
            userId: l.tenant.id,
          },
        ]);
      }
      if (l.unit?.property?.id) setPropertyId(l.unit.property.id);
      if (!title) {
        const propName = l.unit?.property?.name ?? '';
        setTitle(`Lease — ${l.tenant.name} — ${propName} ${l.unit?.unitNumber ?? ''}`.trim());
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfDataUrl) {
      showError('PDF required', 'Upload a PDF document to send.');
      return;
    }
    if (!signers.length || signers.some((s) => !s.name || !s.email)) {
      showError('Signer details required', 'Each signer needs a name and email.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/signing/envelopes', {
        method: 'POST',
        body: JSON.stringify({
          title,
          message: message || undefined,
          sourceFileUrl: pdfDataUrl,
          sourceFileName: pdfName,
          leaseId: leaseId || undefined,
          propertyId: propertyId || undefined,
          expiresInDays: expiresInDays
            ? parseInt(expiresInDays, 10)
            : undefined,
          signers,
        }),
      });
      success('Sent for signature', 'Signing links generated. Copy and share them from the list.');
      onSuccess();
    } catch (err) {
      showError(
        'Failed to send',
        err instanceof Error ? err.message : 'Could not send envelope',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Document (PDF) *
        </label>
        {pdfDataUrl ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {pdfName}
              </p>
              <p className="text-xs text-gray-500">
                {(pdfSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPdfDataUrl(null);
                setPdfName(null);
                setPdfSize(0);
              }}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 hover:border-gray-400">
            <FileUp className="mb-2 h-6 w-6 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              Click to upload PDF
            </span>
            <span className="mt-1 text-xs text-gray-500">Up to 5 MB</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Title *
        </label>
        <Input
          placeholder="Lease Agreement — Unit 2B"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Link to Lease (optional)
          </label>
          <Select value={leaseId} onChange={(e) => pickLease(e.target.value)}>
            <option value="">None</option>
            {leases?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.tenant?.name ?? 'Tenant'} — {l.unit?.property?.name ?? 'Property'}{' '}
                {l.unit?.unitNumber ?? ''}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Link to Property (optional)
          </label>
          <Select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="">None</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Message to Signer
        </label>
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Signers *
          </label>
          <button
            type="button"
            onClick={addSigner}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <Plus className="h-3 w-3" />
            Add Signer
          </button>
        </div>
        <div className="space-y-2">
          {signers.map((s, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-gray-200 p-3"
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Select
                  value={s.userId || ''}
                  onChange={(e) => pickTenant(idx, e.target.value)}
                >
                  <option value="">— Manual entry —</option>
                  {tenants?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </Select>
                {signers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSigner(idx)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 md:justify-self-end"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input
                  placeholder="Full name"
                  value={s.name}
                  onChange={(e) => updateSigner(idx, { name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={s.email}
                  onChange={(e) =>
                    updateSigner(idx, { email: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Expires in (days)
        </label>
        <Input
          type="number"
          min="1"
          max="180"
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(e.target.value)}
        />
      </div>

      <div className="flex flex-col-reverse justify-end gap-2 border-t pt-4 md:flex-row md:gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send for Signature'}
        </Button>
      </div>
    </form>
  );
}
