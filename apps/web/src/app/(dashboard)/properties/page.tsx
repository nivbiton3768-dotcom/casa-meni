'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { AddPropertyForm } from '@/components/forms/add-property-form';
import { formatCents } from '@/lib/utils';
import {
  Building2,
  Plus,
  MapPin,
  Home,
  Palmtree,
  Hammer,
  Tag,
  ChevronRight,
} from 'lucide-react';

interface Unit {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: string;
  sqft: number | null;
  rentAmountCents: number;
  status: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  status: string;
  purchasePrice: number | null;
  currentValue: number | null;
  units: Unit[];
  _count: { maintenanceJobs: number };
}

interface PropertiesResponse {
  properties: Property[];
  total: number;
  page: number;
  pageSize: number;
}

const typeConfig: Record<string, { label: string; icon: typeof Home; color: string }> = {
  LONG_TERM_RENTAL: { label: 'Long-Term Rental', icon: Home, color: 'bg-blue-100 text-blue-700' },
  SHORT_TERM_RENTAL: { label: 'Short-Term Rental', icon: Palmtree, color: 'bg-purple-100 text-purple-700' },
  RENOVATION: { label: 'Renovation', icon: Hammer, color: 'bg-amber-100 text-amber-700' },
  FOR_SALE: { label: 'For Sale', icon: Tag, color: 'bg-green-100 text-green-700' },
};

export default function PropertiesPage() {
  const { data, loading, refetch } = useApi<PropertiesResponse>('/properties');
  const [showAdd, setShowAdd] = useState(false);

  const properties = data?.properties || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description={
          data ? `${data.total} properties in your portfolio` : 'Loading...'
        }
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        }
      />

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Property"
        size="lg"
      >
        <AddPropertyForm
          onSuccess={() => {
            setShowAdd(false);
            refetch();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-blue-50 p-4">
              <Building2 className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No properties yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first property to start managing your portfolio.
            </p>
            <Button className="mt-6" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const config = typeConfig[property.type] || typeConfig.LONG_TERM_RENTAL;
            const TypeIcon = config.icon;
            const occupiedCount = property.units.filter(
              (u) => u.status === 'OCCUPIED',
            ).length;
            const totalRentCents = property.units.reduce(
              (sum, u) => sum + u.rentAmountCents,
              0,
            );

            return (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900">
                          {property.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {property.address}, {property.city}, {property.state}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300" />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
                      <div>
                        <p className="text-xs text-gray-400">Units</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {property.units.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Occupied</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {occupiedCount}/{property.units.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Monthly Rent</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCents(totalRentCents)}
                        </p>
                      </div>
                    </div>

                    {property.currentValue && (
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-xs text-gray-400">
                          Current Value
                        </span>
                        <span className="text-sm font-semibold text-gray-700">
                          {formatCents(property.currentValue)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
