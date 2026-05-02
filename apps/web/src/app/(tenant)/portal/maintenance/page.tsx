'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { apiFetch, cn } from '@/lib/utils';
import { Plus, Wrench, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  completedAt: string | null;
  property: { name: string };
  unit: { unitNumber: string } | null;
  assignedTo: { name: string } | null;
  messages: { body: string; createdAt: string }[];
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  WAITING_PARTS: 'bg-orange-100 text-orange-700',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

export default function TenantMaintenancePage() {
  const { data: workOrders, loading, refetch } = useApi<WorkOrder[]>('/tenant-portal/work-orders');
  const { success } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'GENERAL',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/tenant-portal/work-orders', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      success('Request submitted', 'Your maintenance request has been sent to management.');
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL' });
      refetch();
    } catch {
      // handled by apiFetch
    } finally {
      setSubmitting(false);
    }
  };

  const open = workOrders?.filter((w) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED') || [];
  const closed = workOrders?.filter((w) => w.status === 'COMPLETED' || w.status === 'CANCELLED') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-sm text-gray-500">
            Submit and track repair requests for your unit
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-14 animate-pulse rounded bg-gray-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Open ({open.length})</h2>
              {open.map((wo) => (
                <Link key={wo.id} href={`/portal/maintenance/${wo.id}`}>
                  <Card className="transition-all hover:shadow-md cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-amber-50 p-2 mt-0.5">
                            <Wrench className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{wo.title}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{wo.description}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                              <span>{new Date(wo.createdAt).toLocaleDateString()}</span>
                              <span className={priorityColors[wo.priority]}>{wo.priority}</span>
                              {wo.category && <span>{wo.category}</span>}
                              {wo.assignedTo && (
                                <span className="text-blue-500">Assigned: {wo.assignedTo.name}</span>
                              )}
                              {wo.messages.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  reply
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={cn('shrink-0 rounded px-2 py-0.5 text-xs font-medium', statusColors[wo.status])}>
                          {wo.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {closed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-500">Resolved ({closed.length})</h2>
              {closed.map((wo) => (
                <Link key={wo.id} href={`/portal/maintenance/${wo.id}`}>
                  <Card className="opacity-60 transition-all hover:opacity-100 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-700">{wo.title}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(wo.createdAt).toLocaleDateString()}
                            {wo.completedAt && ` — Completed ${new Date(wo.completedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', statusColors[wo.status])}>
                          {wo.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {(!workOrders || workOrders.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Wrench className="h-10 w-10 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">No requests yet</h3>
                <p className="text-sm text-gray-500">Need something fixed? Submit a request.</p>
                <Button onClick={() => setShowForm(true)} className="mt-4">
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* New Request Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Maintenance Request" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="What's the issue?"
            placeholder="e.g. Leaking faucet in kitchen"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label="Describe the problem"
            placeholder="Please include as much detail as possible..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="LOW">Low — can wait</option>
              <option value="MEDIUM">Medium — needs attention</option>
              <option value="HIGH">High — affecting daily life</option>
              <option value="URGENT">Urgent — emergency</option>
            </Select>
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="GENERAL">General</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="HVAC">HVAC</option>
              <option value="APPLIANCE">Appliance</option>
              <option value="PEST_CONTROL">Pest Control</option>
              <option value="STRUCTURAL">Structural</option>
              <option value="EXTERIOR">Exterior</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
