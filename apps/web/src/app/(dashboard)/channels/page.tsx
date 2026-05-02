'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import {
  Calendar,
  Plus,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Copy,
} from 'lucide-react';

type Provider = 'AIRBNB' | 'VRBO' | 'BOOKING' | 'OTHER';

interface Property {
  id: string;
  name: string;
}

interface ChannelFeed {
  id: string;
  provider: Provider;
  name: string;
  importUrl: string;
  exportUrl: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  property: { id: string; name: string };
  unit: { id: string; unitNumber: string } | null;
}

const providerLabels: Record<Provider, string> = {
  AIRBNB: 'Airbnb',
  VRBO: 'VRBO',
  BOOKING: 'Booking.com',
  OTHER: 'Other',
};

const providerColors: Record<Provider, string> = {
  AIRBNB: 'bg-rose-50 text-rose-700',
  VRBO: 'bg-sky-50 text-sky-700',
  BOOKING: 'bg-blue-50 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export default function ChannelsPage() {
  const { data: feeds, loading, refetch } =
    useApi<ChannelFeed[]>('/channels/feeds');
  const { data: properties } = useApi<Property[]>('/properties');
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch<{
        data: { added: number; updated: number; conflicts: number; errors: number };
      }>('/channels/sync/now', { method: 'POST' });
      const r = res.data;
      toast.success(
        'Sync complete',
        `${r.added} new, ${r.updated} updated${r.conflicts ? `, ${r.conflicts} conflicts` : ''}${r.errors ? `, ${r.errors} errors` : ''}`,
      );
      refetch();
    } catch (err) {
      toast.error('Sync failed', err instanceof Error ? err.message : '');
    } finally {
      setSyncing(false);
    }
  };

  const remove = async (id: string) => {
    if (
      !confirm(
        'Remove this channel feed? Past reservations stay; new ones won’t sync.',
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/channels/feeds/${id}`, { method: 'DELETE' });
      toast.success('Removed');
      refetch();
    } catch (err) {
      toast.error('Remove failed', err instanceof Error ? err.message : '');
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      window.prompt('Copy:', text);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channels"
        description="Sync availability with Airbnb, VRBO, Booking.com via iCal feeds."
        actions={
          <div className="flex flex-wrap gap-2">
            {feeds && feeds.length > 0 && (
              <Button variant="secondary" onClick={sync} disabled={syncing}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                />
                {syncing ? 'Syncing…' : 'Sync now'}
              </Button>
            )}
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add channel
            </Button>
          </div>
        }
      />

      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 text-sm text-blue-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold">How channel sync works</p>
              <ol className="mt-1 list-inside list-decimal space-y-1">
                <li>
                  Find your listing&apos;s iCal export URL on Airbnb / VRBO /
                  Booking and paste it here as an <em>Import URL</em>.
                </li>
                <li>
                  Casa Meni pulls bookings every sync and creates reservations
                  automatically.
                </li>
                <li>
                  Copy the <em>Export URL</em> we generate and paste it back
                  into the channel as a sync calendar — that way every channel
                  blocks dates from every other channel.
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !feeds || feeds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-rose-50 p-4">
              <Calendar className="h-10 w-10 text-rose-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No channels connected
            </h3>
            <p className="mt-1 max-w-md text-center text-sm text-gray-500">
              Connect Airbnb, VRBO, or Booking.com so reservations show up
              automatically and double-bookings stop happening.
            </p>
            <Button className="mt-6" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Connect a channel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feeds.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${providerColors[f.provider]}`}
                      >
                        {providerLabels[f.provider]}
                      </span>
                      <h3 className="text-base font-semibold text-gray-900">
                        {f.name}
                      </h3>
                      {f.lastSyncError ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                          <AlertCircle className="h-3 w-3" />
                          Error
                        </span>
                      ) : f.lastSyncedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {new Date(f.lastSyncedAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          Never synced
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {f.property.name}
                      {f.unit ? ` · Unit ${f.unit.unitNumber}` : ''}
                    </p>

                    {f.lastSyncError && (
                      <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                        {f.lastSyncError}
                      </p>
                    )}

                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <p className="text-[10px] font-semibold uppercase text-gray-500">
                          Import (incoming bookings)
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate text-xs text-gray-700">
                            {f.importUrl}
                          </code>
                          <button
                            onClick={() => copy(f.importUrl, 'Import URL')}
                            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                            aria-label="Copy import URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <p className="text-[10px] font-semibold uppercase text-gray-500">
                          Export (paste into channel)
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate text-xs text-gray-700">
                            {f.exportUrl}
                          </code>
                          <button
                            onClick={() => copy(f.exportUrl, 'Export URL')}
                            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                            aria-label="Copy export URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={f.exportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-row gap-2 md:flex-col">
                    <button
                      onClick={() => remove(f.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Connect a channel"
        size="md"
      >
        <AddChannelForm
          properties={properties ?? []}
          onSuccess={() => {
            setShowAdd(false);
            refetch();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  );
}

interface AddChannelFormProps {
  properties: Property[];
  onSuccess: () => void;
  onCancel: () => void;
}

function AddChannelForm({ properties, onSuccess, onCancel }: AddChannelFormProps) {
  const [provider, setProvider] = useState<Provider>('AIRBNB');
  const [name, setName] = useState('');
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '');
  const [importUrl, setImportUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/channels/feeds', {
        method: 'POST',
        body: JSON.stringify({ provider, name, propertyId, importUrl }),
      });
      toast.success('Channel connected', 'Initial sync started in background');
      onSuccess();
    } catch (err) {
      toast.error('Connect failed', err instanceof Error ? err.message : '');
    } finally {
      setSubmitting(false);
    }
  };

  const helpText: Record<Provider, string> = {
    AIRBNB:
      'In Airbnb: Listing → Calendar → Availability → Sync calendars → Export Calendar → copy the URL.',
    VRBO:
      'In VRBO: Calendar → Import/Export → Export this calendar → copy the URL.',
    BOOKING:
      'In Booking.com Extranet: Property → Calendar → Sync calendars → Export Calendar → copy the URL.',
    OTHER: 'Find the iCal export URL in your channel and paste it here.',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Channel
        </label>
        <Select
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
        >
          <option value="AIRBNB">Airbnb</option>
          <option value="VRBO">VRBO</option>
          <option value="BOOKING">Booking.com</option>
          <option value="OTHER">Other (any iCal)</option>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Property
        </label>
        <Select
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          <option value="">Select a property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Listing nickname
        </label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lake House — Airbnb"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Import URL (iCal)
        </label>
        <Input
          required
          type="url"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          placeholder="https://www.airbnb.com/calendar/ical/..."
        />
        <p className="mt-1 text-xs text-gray-500">{helpText[provider]}</p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Connecting…' : 'Connect'}
        </Button>
      </div>
    </form>
  );
}
