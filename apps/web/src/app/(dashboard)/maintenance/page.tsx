'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { AddWorkOrderForm } from '@/components/forms/add-work-order-form';
import { cn } from '@/lib/utils';
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CircleDot,
  MapPin,
} from 'lucide-react';

interface MaintenanceJob {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string | null;
  estimateCents: number | null;
  scheduledDate: string | null;
  completedAt: string | null;
  createdAt: string;
  property: { id: string; name: string };
  unit: { id: string; unitNumber: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  EMERGENCY: { label: 'Emergency', color: 'bg-red-100 text-red-700' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  OPEN: { label: 'Open', icon: CircleDot, color: 'text-blue-600' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, color: 'text-orange-600' },
  WAITING_PARTS: { label: 'Waiting Parts', icon: Clock, color: 'text-purple-600' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-green-600' },
  CANCELLED: { label: 'Cancelled', icon: AlertTriangle, color: 'text-gray-400' },
};

export default function MaintenancePage() {
  const { data: jobs, loading, refetch } = useApi<MaintenanceJob[]>('/maintenance');
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500">
            {jobs ? `${jobs.length} work orders` : 'Loading...'}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Work Order
        </Button>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Work Order"
        size="md"
      >
        <AddWorkOrderForm
          onSuccess={() => {
            setShowAdd(false);
            refetch();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-orange-50 p-4">
              <Wrench className="h-10 w-10 text-orange-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No work orders
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Maintenance requests and work orders will appear here.
            </p>
            <Button className="mt-6" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Work Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const priority = priorityConfig[job.priority] || priorityConfig.MEDIUM;
            const status = statusConfig[job.status] || statusConfig.OPEN;
            const StatusIcon = status.icon;

            return (
              <Card key={job.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            priority.color,
                          )}
                        >
                          {priority.label}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-medium',
                            status.color,
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                        {job.category && (
                          <span className="text-xs text-gray-400 capitalize">
                            {job.category}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                        {job.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.property.name}
                      {job.unit ? ` — Unit ${job.unit.unitNumber}` : ''}
                    </span>
                    {job.assignedTo && (
                      <span>
                        Assigned to{' '}
                        <span className="font-medium text-gray-700">
                          {job.assignedTo.name}
                        </span>
                      </span>
                    )}
                    {job.scheduledDate && (
                      <span>
                        Scheduled{' '}
                        {new Date(job.scheduledDate).toLocaleDateString()}
                      </span>
                    )}
                    <span>
                      Reported by {job.createdBy.name} on{' '}
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
