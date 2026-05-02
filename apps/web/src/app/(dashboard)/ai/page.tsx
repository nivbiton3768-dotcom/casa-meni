'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { Cpu, Sparkles, Zap } from 'lucide-react';

interface Stats {
  total: number;
  aiCategorized: number;
  percent: number;
}

export default function AIPage() {
  const { data: stats, refetch } = useApi<Stats>('/ai/stats');
  const toast = useToast();
  const [test, setTest] = useState({ description: '', amountCents: 0 });
  const [result, setResult] = useState<{ category: string; confidence: number; reason: string } | null>(null);
  const [running, setRunning] = useState(false);

  const classify = async () => {
    try {
      const res = await apiFetch<{ data: typeof result }>('/ai/categorize', {
        method: 'POST',
        body: JSON.stringify(test),
      });
      setResult(res.data);
    } catch {
      toast.error('Failed');
    }
  };

  const backfill = async () => {
    setRunning(true);
    try {
      const res = await apiFetch<{ data: { queued: number } }>(
        '/ai/categorize/backfill',
        { method: 'POST' },
      );
      toast.success(`Queued ${res.data.queued} transactions`);
      refetch();
    } catch {
      toast.error('Backfill failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Tools"
        description="Auto-categorize transactions, score deals, and analyze data with AI."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Total transactions</div>
            <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">AI categorized</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.aiCategorized ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">Coverage</div>
            <div className="text-3xl font-bold text-emerald-600">
              {stats?.percent ?? 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Backfill categorization</h3>
              <p className="text-sm text-gray-500">
                Re-classify every transaction that hasn't been touched by AI yet.
              </p>
            </div>
            <Button onClick={backfill} disabled={running}>
              <Zap className="mr-2 h-4 w-4" />
              {running ? 'Running…' : 'Run now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Test the classifier
          </h3>
          <Input
            placeholder="Description (e.g., Home Depot purchase)"
            value={test.description}
            onChange={(e) => setTest({ ...test, description: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Amount ($)"
            onChange={(e) =>
              setTest({ ...test, amountCents: Math.round(Number(e.target.value) * 100) })
            }
          />
          <Button onClick={classify}>
            <Cpu className="mr-2 h-4 w-4" /> Classify
          </Button>
          {result && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm">
              <div>
                <strong>Category:</strong> {result.category}
              </div>
              <div>
                <strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">via {result.reason}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
