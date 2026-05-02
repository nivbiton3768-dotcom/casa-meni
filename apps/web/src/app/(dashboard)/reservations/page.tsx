'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCents, cn } from '@/lib/utils';
import {
  CalendarDays,
  Plus,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  LogOut,
  XCircle,
  Mail,
} from 'lucide-react';

interface Reservation {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  channel: string | null;
  externalId: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
  nightlyRateCents: number;
  totalCents: number;
  cleaningFeeCents: number;
  notes: string | null;
  property: { id: string; name: string };
  unit: { id: string; unitNumber: string } | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  INQUIRY: { label: 'Inquiry', icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-100' },
  CONFIRMED: { label: 'Confirmed', icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-100' },
  CHECKED_IN: { label: 'Checked In', icon: User, color: 'text-blue-700', bg: 'bg-blue-100' },
  CHECKED_OUT: { label: 'Checked Out', icon: LogOut, color: 'text-gray-600', bg: 'bg-gray-100' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' },
};

const channelColors: Record<string, string> = {
  airbnb: 'bg-pink-100 text-pink-700',
  vrbo: 'bg-blue-100 text-blue-700',
  direct: 'bg-emerald-100 text-emerald-700',
  booking: 'bg-indigo-100 text-indigo-700',
};

export default function ReservationsPage() {
  const { data: reservations, loading } =
    useApi<Reservation[]>('/reservations');

  const nights = (checkIn: string, checkOut: string) => {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500">
            {reservations
              ? `${reservations.length} reservations`
              : 'Loading...'}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Reservation
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-24 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !reservations || reservations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-indigo-50 p-4">
              <CalendarDays className="h-10 w-10 text-indigo-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No reservations
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Short-term rental bookings will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reservations.map((res) => {
            const status = statusConfig[res.status] || statusConfig.INQUIRY;
            const StatusIcon = status.icon;
            const numNights = nights(res.checkIn, res.checkOut);
            const isPast = new Date(res.checkOut) < new Date();
            const isCurrent =
              new Date(res.checkIn) <= new Date() &&
              new Date(res.checkOut) >= new Date();

            return (
              <Card
                key={res.id}
                className={cn(
                  'transition-shadow hover:shadow-md',
                  isPast && 'opacity-70',
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            status.bg,
                            status.color,
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        {res.channel && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                              channelColors[res.channel] ||
                                'bg-gray-100 text-gray-600',
                            )}
                          >
                            {res.channel}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                            Currently Staying
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 font-semibold text-gray-900">
                        {res.guestName}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {res.guestEmail}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {res.property.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCents(res.totalCents)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {numNights} nights @{' '}
                        {formatCents(res.nightlyRateCents)}/night
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-6 border-t pt-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>
                        {new Date(res.checkIn).toLocaleDateString()} →{' '}
                        {new Date(res.checkOut).toLocaleDateString()}
                      </span>
                    </div>
                    {res.externalId && (
                      <span className="text-xs text-gray-400">
                        Ref: {res.externalId}
                      </span>
                    )}
                    {res.cleaningFeeCents > 0 && (
                      <span className="text-xs text-gray-400">
                        Cleaning: {formatCents(res.cleaningFeeCents)}
                      </span>
                    )}
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
