'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCents, cn } from '@/lib/utils';
import { Users, Mail, Phone, Home, Calendar, AlertCircle } from 'lucide-react';

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
  const { data: tenants, loading } = useApi<Tenant[]>('/leases/tenants');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <p className="text-sm text-gray-500">
          {tenants ? `${tenants.length} active tenants` : 'Loading...'}
        </p>
      </div>

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
              Tenants will appear here once you create leases.
            </p>
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
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold text-lg">
                        {tenant.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
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
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {tenant.email}
                          </span>
                          {tenant.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
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
                        <div
                          key={lease.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Home className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {lease.propertyName} — Unit {lease.unitNumber}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  lease.startDate,
                                ).toLocaleDateString()}{' '}
                                —{' '}
                                {new Date(lease.endDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
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
                        </div>
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
