'use client';

import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react';

interface Event {
  id: string;
  category: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

const severityColor: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
};

export default function EmergencyPage() {
  const { data: events, refetch } = useApi<Event[]>('/emergency/admin');
  const toast = useToast();

  const ack = async (id: string) => {
    await apiFetch(`/emergency/admin/${id}/acknowledge`, { method: 'PATCH' });
    refetch();
  };
  const resolve = async (id: string) => {
    await apiFetch(`/emergency/admin/${id}/resolve`, { method: 'PATCH' });
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Reports"
        description="Critical issues reported by tenants — every report alerts owners + property managers immediately."
      />

      <div className="space-y-3">
        {events?.map((e) => (
          <Card key={e.id} className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold capitalize">{e.category}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${severityColor[e.severity]}`}
                    >
                      {e.severity}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                      {e.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{e.description}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.acknowledgedAt &&
                      ` · acked ${new Date(e.acknowledgedAt).toLocaleString()}`}
                    {e.resolvedAt &&
                      ` · resolved ${new Date(e.resolvedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {e.status === 'OPEN' && (
                    <Button size="sm" variant="secondary" onClick={() => ack(e.id)}>
                      <Eye className="mr-1 h-3 w-3" /> Acknowledge
                    </Button>
                  )}
                  {e.status !== 'RESOLVED' && (
                    <Button size="sm" onClick={() => resolve(e.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Resolve
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!events?.length && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No emergency reports — that's a good day.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
