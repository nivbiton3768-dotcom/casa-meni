'use client';

import { useState, FormEvent } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
}

interface Lease {
  id: string;
  tenant: { name: string };
  unit: { unitNumber: string };
  property: { name: string };
}

interface AddDocumentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const MIME_TYPES = [
  { value: 'application/pdf', label: 'PDF' },
  { value: 'image/jpeg', label: 'JPEG Image' },
  { value: 'image/png', label: 'PNG Image' },
  { value: 'application/msword', label: 'Word Document' },
  { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel Spreadsheet' },
  { value: 'text/plain', label: 'Text File' },
];

export function AddDocumentForm({ onSuccess, onCancel }: AddDocumentFormProps) {
  const { success, error: showError } = useToast();
  const { data: properties } = useApi<Property[]>('/properties');
  const { data: leases } = useApi<Lease[]>('/leases');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    propertyId: '',
    leaseId: '',
    fileUrl: '',
    mimeType: '',
    sizeBytes: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          propertyId: form.propertyId || undefined,
          leaseId: form.leaseId || undefined,
          fileUrl: form.fileUrl,
          mimeType: form.mimeType || undefined,
          sizeBytes: form.sizeBytes ? parseInt(form.sizeBytes, 10) : undefined,
        }),
      });
      success('Document added', `"${form.name}" has been saved.`);
      onSuccess();
    } catch (err) {
      showError('Failed', err instanceof Error ? err.message : 'Could not add document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Document Name *</label>
        <Input
          placeholder="Lease Agreement — Unit 2B"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Property</label>
          <Select value={form.propertyId} onChange={(e) => update('propertyId', e.target.value)}>
            <option value="">None</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Lease</label>
          <Select value={form.leaseId} onChange={(e) => update('leaseId', e.target.value)}>
            <option value="">None</option>
            {leases?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.tenant.name} — {l.property.name} {l.unit.unitNumber}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">File URL *</label>
        <Input
          type="url"
          placeholder="https://storage.example.com/docs/lease.pdf"
          value={form.fileUrl}
          onChange={(e) => update('fileUrl', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">File Type</label>
          <Select value={form.mimeType} onChange={(e) => update('mimeType', e.target.value)}>
            <option value="">Select type...</option>
            {MIME_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">File Size (bytes)</label>
          <Input
            type="number"
            placeholder="1048576"
            min="0"
            value={form.sizeBytes}
            onChange={(e) => update('sizeBytes', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Document'}</Button>
      </div>
    </form>
  );
}
