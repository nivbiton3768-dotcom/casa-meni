'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { AddVendorForm } from '@/components/forms/add-vendor-form';
import { cn } from '@/lib/utils';
import {
  HardHat,
  Plus,
  Mail,
  Phone,
  Wrench,
  Receipt,
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  trade: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  _count: { renovationExpenses: number };
}

export default function VendorsPage() {
  const { data: vendors, loading, refetch } = useApi<Vendor[]>('/vendors');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors & Contractors"
        description={vendors ? `${vendors.length} vendors` : 'Loading...'}
        actions={
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Vendor
          </Button>
        }
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Vendor / Contractor">
        <AddVendorForm onSuccess={() => { setShowCreate(false); refetch(); }} onCancel={() => setShowCreate(false)} />
      </Modal>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse rounded bg-gray-50" /></CardContent></Card>
          ))}
        </div>
      ) : !vendors || vendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-indigo-50 p-4">
              <HardHat className="h-10 w-10 text-indigo-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No vendors yet</h3>
            <p className="mt-1 text-sm text-gray-500">Add contractors, plumbers, electricians, and suppliers.</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add First Vendor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-lg">
                    {vendor.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                      {vendor.trade && (
                        <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          <Wrench className="h-3 w-3" />
                          {vendor.trade}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {vendor.email && (
                        <p className="flex min-w-0 items-center gap-1.5 text-sm text-gray-500">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{vendor.email}</span>
                        </p>
                      )}
                      {vendor.phone && (
                        <p className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {vendor.phone}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Receipt className="h-3.5 w-3.5 shrink-0" />
                        {vendor._count.renovationExpenses} expense{vendor._count.renovationExpenses !== 1 ? 's' : ''} recorded
                      </p>
                    </div>
                    {vendor.notes && (
                      <p className="mt-2 text-xs text-gray-400 line-clamp-2">{vendor.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
