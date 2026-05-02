'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { CreateLeaseForm } from '@/components/forms/create-lease-form';
import { formatCents, cn } from '@/lib/utils';
import {
  Users,
  Mail,
  Phone,
  Home,
  Calendar,
  AlertCircle,
  Plus,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface TenantLease {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmountCents: number;
  propertyName: string;
  unitNumber: string;
  nextPaymentDue: string | null;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  leases: TenantLease[];
}

export default function TenantsPage() {
  const { data: tenants, loading, refetch } = useApi<Tenant[]>('/leases/tenants');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description={
          tenants ? `${tenants.length} active tenants` : 'Loading...'
        }
        actions={
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Lease
          </Button>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Lease"
        size="lg"
      >
        <CreateLeaseForm
          onSuccess={() => {
            setShowCreate(false);
            refetch();
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !tenants || tenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-purple-50 p-4">
              <Users className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No tenants yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first lease to add tenants.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Lease
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const hasOverdue = tenant.leases.some(
              (l) =>
                l.nextPaymentDue && new Date(l.nextPaymentDue) < new Date(),
            );

            return (
              <Card
                key={tenant.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3 md:gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold text-lg">
                        {tenant.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {tenant.name}
                          </h3>
                          {hasOverdue && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              <AlertCircle className="h-3 w-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                          <span className="flex min-w-0 items-center gap-1">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{tenant.email}</span>
                          </span>
                          {tenant.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              {tenant.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {tenant.leases.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {tenant.leases.map((lease) => (
                        <Link
                          key={lease.id}
                          href={`/tenants/leases/${lease.id}`}
                          className="flex flex-col gap-3 rounded-lg bg-gray-50 px-3 py-3 transition-colors hover:bg-gray-100 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Home className="h-4 w-4 shrink-0 text-gray-400" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-700">
                                {lease.propertyName} — Unit {lease.unitNumber}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {new Date(
                                  lease.startDate,
                                ).toLocaleDateString()}{' '}
                                —{' '}
                                {new Date(lease.endDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <div className="text-left sm:text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCents(lease.rentAmountCents)}/mo
                              </p>
                              {lease.nextPaymentDue && (
                                <p
                                  className={cn(
                                    'text-xs',
                                    new Date(lease.nextPaymentDue) < new Date()
                                      ? 'text-red-600 font-medium'
                                      : 'text-gray-400',
                                  )}
                                >
                                  Due{' '}
                                  {new Date(
                                    lease.nextPaymentDue,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <FileText className="h-4 w-4 shrink-0 text-gray-300" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
