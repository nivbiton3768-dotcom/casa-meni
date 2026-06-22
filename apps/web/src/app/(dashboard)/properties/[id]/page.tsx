'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AddUnitForm } from '@/components/forms/add-unit-form';
import { CreateLeaseForm } from '@/components/forms/create-lease-form';
import { EditTenantForm } from '@/components/forms/edit-tenant-form';
import { TransferLeaseForm } from '@/components/forms/transfer-lease-form';
import { useToast } from '@/components/ui/toast';
import { formatCents, cn, apiFetch } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  MapPin,
  Home,
  Palmtree,
  Hammer,
  Tag,
  Users,
  Wrench,
  DollarSign,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Calendar,
  UserPlus,
  UserMinus,
  ChevronRight,
  Pencil,
  ArrowLeftRight,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface Lease {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmountCents: number;
  tenant: Tenant;
}

interface Unit {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: string;
  sqft: number | null;
  rentAmountCents: number;
  status: string;
  leases: Lease[];
}

interface MaintenanceJob {
  id: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string;
  amountCents: number;
  date: string;
}

interface RenovationExpense {
  id: string;
  category: string;
  description: string;
  amountCents: number;
  date: string;
}

interface Renovation {
  id: string;
  name: string;
  status: string;
  budgetCents: number;
  actualCostCents: number;
  startDate: string | null;
  endDate: string | null;
  expenses: RenovationExpense[];
}

interface Document {
  id: string;
  name: string;
  fileUrl: string;
  createdAt: string;
}

interface Listing {
  id: string;
  status: string;
  askingPriceCents: number;
  description: string | null;
}

interface PropertyDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  status: string;
  purchasePrice: number | null;
  purchaseDate: string | null;
  currentValue: number | null;
  notes: string | null;
  units: Unit[];
  entity: { id: string; name: string } | null;
  maintenanceJobs: MaintenanceJob[];
  transactions: Transaction[];
  documents: Document[];
  renovations: Renovation[];
  listings: Listing[];
}

const typeConfig: Record<string, { label: string; icon: typeof Home; color: string }> = {
  LONG_TERM_RENTAL: { label: 'Long-Term Rental', icon: Home, color: 'bg-blue-100 text-blue-700' },
  SHORT_TERM_RENTAL: { label: 'Short-Term Rental', icon: Palmtree, color: 'bg-purple-100 text-purple-700' },
  RENOVATION: { label: 'Renovation', icon: Hammer, color: 'bg-amber-100 text-amber-700' },
  FOR_SALE: { label: 'For Sale', icon: Tag, color: 'bg-green-100 text-green-700' },
};

const statusColors: Record<string, string> = {
  VACANT: 'bg-green-100 text-green-700',
  OCCUPIED: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
};

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: property, loading, refetch } = useApi<PropertyDetail>(
    `/properties/${id}`,
  );
  const toast = useToast();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [leaseUnitId, setLeaseUnitId] = useState<string | null>(null);
  const [showNewLease, setShowNewLease] = useState(false);
  const [endingLeaseId, setEndingLeaseId] = useState<string | null>(null);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [transferLease, setTransferLease] = useState<{
    id: string;
    tenantName: string;
    rentCents: number;
  } | null>(null);

  const openNewLease = (unitId?: string) => {
    setLeaseUnitId(unitId ?? null);
    setShowNewLease(true);
  };

  const endLease = async (leaseId: string, tenantName: string) => {
    if (
      !confirm(
        `End ${tenantName}'s lease? The unit will be marked vacant and any future unpaid rent will be removed.`,
      )
    ) {
      return;
    }
    setEndingLeaseId(leaseId);
    try {
      await apiFetch(`/leases/${leaseId}/end`, { method: 'PATCH' });
      toast.success('Lease ended', `${tenantName}'s unit is now vacant.`);
      refetch();
    } catch (err) {
      toast.error('Failed to end lease', err instanceof Error ? err.message : '');
    } finally {
      setEndingLeaseId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
                <div className="h-40 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="h-60 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!property) return null;

  const config = typeConfig[property.type] || typeConfig.LONG_TERM_RENTAL;
  const TypeIcon = config.icon;
  const occupiedCount = property.units.filter((u) => u.status === 'OCCUPIED').length;
  const totalRentCents = property.units.reduce((s, u) => s + u.rentAmountCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex items-start gap-3 md:flex-1">
          <Link
            href="/properties"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                {property.name}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  config.color,
                )}
              >
                <TypeIcon className="h-3 w-3" />
                {config.label}
              </span>
            </div>
            <div className="flex items-start gap-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="min-w-0 break-words">
                {property.address}, {property.city}, {property.state} {property.zip}
              </span>
            </div>
          </div>
        </div>
        <Button variant="secondary" className="md:shrink-0">Edit Property</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Units & Tenants */}
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                Units &amp; Tenants ({property.units.length})
              </CardTitle>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddUnit(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Unit
                </Button>
                <Button
                  size="sm"
                  onClick={() => openNewLease()}
                  className="w-full sm:w-auto"
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  New Lease
                </Button>
              </div>
            </CardHeader>

            <Modal
              open={showAddUnit}
              onClose={() => setShowAddUnit(false)}
              title="Add Unit"
              size="sm"
            >
              <AddUnitForm
                propertyId={property.id}
                onSuccess={() => {
                  setShowAddUnit(false);
                  refetch();
                }}
                onCancel={() => setShowAddUnit(false)}
              />
            </Modal>

            <Modal
              open={showNewLease}
              onClose={() => setShowNewLease(false)}
              title={leaseUnitId ? 'Add Tenant to Unit' : 'New Lease'}
              size="lg"
            >
              <CreateLeaseForm
                propertyId={property.id}
                defaultUnitId={leaseUnitId ?? undefined}
                onSuccess={() => {
                  setShowNewLease(false);
                  setLeaseUnitId(null);
                  refetch();
                }}
                onCancel={() => {
                  setShowNewLease(false);
                  setLeaseUnitId(null);
                }}
              />
            </Modal>

            <Modal
              open={!!editTenant}
              onClose={() => setEditTenant(null)}
              title="Edit Tenant"
              size="md"
            >
              {editTenant && (
                <EditTenantForm
                  tenant={editTenant}
                  onSuccess={() => {
                    setEditTenant(null);
                    refetch();
                  }}
                  onCancel={() => setEditTenant(null)}
                />
              )}
            </Modal>

            <Modal
              open={!!transferLease}
              onClose={() => setTransferLease(null)}
              title="Move Tenant to Another Unit"
              size="md"
            >
              {transferLease && (
                <TransferLeaseForm
                  leaseId={transferLease.id}
                  tenantName={transferLease.tenantName}
                  currentRentCents={transferLease.rentCents}
                  onSuccess={() => {
                    setTransferLease(null);
                    refetch();
                  }}
                  onCancel={() => setTransferLease(null)}
                />
              )}
            </Modal>

            <CardContent>
              {property.units.length === 0 ? (
                <p className="text-sm text-gray-500">No units configured.</p>
              ) : (
                <div className="divide-y">
                  {property.units.map((unit) => {
                    const activeLease = unit.leases[0];
                    return (
                      <div key={unit.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-900">
                                Unit {unit.unitNumber}
                              </span>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  statusColors[unit.status] || 'bg-gray-100 text-gray-600',
                                )}
                              >
                                {unit.status.toLowerCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {unit.bedrooms}bd / {unit.bathrooms}ba
                              {unit.sqft ? ` · ${unit.sqft.toLocaleString()} sqft` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-gray-900">
                            {formatCents(unit.rentAmountCents)}/mo
                          </span>
                        </div>

                        {activeLease ? (
                          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                                  {activeLease.tenant.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-gray-900">
                                    {activeLease.tenant.name}
                                  </p>
                                  <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    {activeLease.tenant.email}
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="h-3 w-3 shrink-0" />
                                    {new Date(activeLease.startDate).toLocaleDateString()} —{' '}
                                    {new Date(activeLease.endDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Link
                                href={`/tenants/leases/${activeLease.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                View lease
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                              <button
                                onClick={() => setEditTenant(activeLease.tenant)}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit tenant
                              </button>
                              <button
                                onClick={() =>
                                  setTransferLease({
                                    id: activeLease.id,
                                    tenantName: activeLease.tenant.name,
                                    rentCents: activeLease.rentAmountCents,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <ArrowLeftRight className="h-3 w-3" />
                                Move unit
                              </button>
                              <button
                                onClick={() =>
                                  endLease(activeLease.id, activeLease.tenant.name)
                                }
                                disabled={endingLeaseId === activeLease.id}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <UserMinus className="h-3 w-3" />
                                {endingLeaseId === activeLease.id
                                  ? 'Ending…'
                                  : 'End lease'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <button
                              onClick={() => openNewLease(unit.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
                            >
                              <UserPlus className="h-3 w-3" />
                              Add tenant
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renovation */}
          {property.renovations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hammer className="h-5 w-5 text-gray-400" />
                  Renovation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {property.renovations.map((reno) => (
                  <div key={reno.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{reno.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {reno.status.toLowerCase().replace(/_/g, ' ')}
                          {reno.startDate &&
                            ` · Started ${new Date(reno.startDate).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCents(reno.actualCostCents)} /{' '}
                          {formatCents(reno.budgetCents)}
                        </p>
                        <p className="text-xs text-gray-500">spent / budget</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          reno.actualCostCents / reno.budgetCents > 0.9
                            ? 'bg-red-500'
                            : 'bg-blue-500',
                        )}
                        style={{
                          width: `${Math.min(100, (reno.actualCostCents / reno.budgetCents) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {Math.round(
                        (reno.actualCostCents / reno.budgetCents) * 100,
                      )}
                      % of budget used
                    </p>

                    {reno.expenses.length > 0 && (
                      <div className="mt-4 divide-y">
                        {reno.expenses.map((exp) => (
                          <div
                            key={exp.id}
                            className="flex items-start justify-between gap-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700">
                                {exp.description}
                              </p>
                              <p className="text-xs text-gray-400 capitalize">
                                {exp.category} &middot;{' '}
                                {new Date(exp.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-medium text-gray-900">
                              {formatCents(exp.amountCents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          {property.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {property.transactions.map((tx) => {
                    const isIncome = tx.type === 'INCOME';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-start justify-between gap-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                              isIncome ? 'bg-green-50' : 'bg-red-50',
                            )}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="h-3 w-3 text-green-600" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-red-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-gray-700">
                              {tx.description}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(tx.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 text-sm font-medium',
                            isIncome ? 'text-green-600' : 'text-red-600',
                          )}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCents(tx.amountCents)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maintenance */}
          {property.maintenanceJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-gray-400" />
                  Recent Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {property.maintenanceJobs.map((job) => (
                    <div key={job.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700">
                          {job.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(job.createdAt).toLocaleDateString()} &middot;{' '}
                          <span className="capitalize">
                            {job.status.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                          job.priority === 'EMERGENCY'
                            ? 'bg-red-100 text-red-700'
                            : job.priority === 'HIGH'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {job.priority.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatRow
                  label="Units"
                  value={property.units.length.toString()}
                />
                <StatRow
                  label="Occupancy"
                  value={
                    property.units.length > 0
                      ? `${occupiedCount}/${property.units.length} (${Math.round((occupiedCount / property.units.length) * 100)}%)`
                      : 'N/A'
                  }
                />
                <StatRow
                  label="Monthly Rent"
                  value={formatCents(totalRentCents)}
                />
                {property.purchasePrice && (
                  <StatRow
                    label="Purchase Price"
                    value={formatCents(property.purchasePrice)}
                  />
                )}
                {property.currentValue && (
                  <StatRow
                    label="Current Value"
                    value={formatCents(property.currentValue)}
                  />
                )}
                {property.purchasePrice && property.currentValue && (
                  <StatRow
                    label="Appreciation"
                    value={`${property.currentValue > property.purchasePrice ? '+' : ''}${formatCents(property.currentValue - property.purchasePrice)}`}
                    highlight={property.currentValue >= property.purchasePrice}
                  />
                )}
                {property.entity && (
                  <StatRow label="Entity" value={property.entity.name} />
                )}
                {property.purchaseDate && (
                  <StatRow
                    label="Purchase Date"
                    value={new Date(
                      property.purchaseDate,
                    ).toLocaleDateString()}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Listing */}
          {property.listings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-gray-400" />
                  Listing
                </CardTitle>
              </CardHeader>
              <CardContent>
                {property.listings.map((listing) => (
                  <div key={listing.id}>
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          listing.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {listing.status}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCents(listing.askingPriceCents)}
                      </span>
                    </div>
                    {listing.description && (
                      <p className="mt-2 text-sm text-gray-500">
                        {listing.description}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {property.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  Documents ({property.documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {property.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 p-2"
                    >
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 truncate">
                        <p className="truncate text-sm text-gray-700">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {property.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{property.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={cn(
          'text-sm font-medium',
          highlight !== undefined
            ? highlight
              ? 'text-green-600'
              : 'text-red-600'
            : 'text-gray-900',
        )}
      >
        {value}
      </span>
    </div>
  );
}
