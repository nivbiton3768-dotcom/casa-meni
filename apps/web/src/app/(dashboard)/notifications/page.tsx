'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch, cn } from '@/lib/utils';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  DollarSign,
  Calendar,
  Wrench,
  Hammer,
  CalendarDays,
  Info,
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeConfig: Record<string, { color: string; bg: string; icon: typeof Bell; label: string }> = {
  PAYMENT_OVERDUE: { color: 'text-red-600', bg: 'bg-red-50', icon: DollarSign, label: 'Payment Overdue' },
  LEASE_EXPIRING: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Calendar, label: 'Lease Expiring' },
  MAINTENANCE_UPDATE: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Wrench, label: 'Maintenance' },
  RENOVATION_BUDGET: { color: 'text-orange-600', bg: 'bg-orange-50', icon: Hammer, label: 'Budget Alert' },
  RESERVATION_UPCOMING: { color: 'text-purple-600', bg: 'bg-purple-50', icon: CalendarDays, label: 'Reservation' },
  GENERAL: { color: 'text-gray-600', bg: 'bg-gray-50', icon: Info, label: 'General' },
};

export default function NotificationsPage() {
  const { data: notifications, loading, refetch } = useApi<Notification[]>('/notifications');
  const { success } = useToast();
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications?.filter((n) =>
    filter === 'unread' ? !n.isRead : true,
  );

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  const handleMarkRead = async (id: string) => {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    refetch();
  };

  const handleMarkAllRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    success('Done', 'All notifications marked as read.');
    refetch();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch<{ data: { alertsGenerated: number } }>(
        '/notifications/generate',
        { method: 'POST' },
      );
      success('Alerts generated', `${res.data.alertsGenerated} new alerts created.`);
      refetch();
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {notifications ? `${notifications.length} total, ${unreadCount} unread` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleGenerate} disabled={generating} className="flex items-center gap-2">
            <RefreshCw className={cn('h-4 w-4', generating && 'animate-spin')} />
            {generating ? 'Checking...' : 'Check for Alerts'}
          </Button>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={handleMarkAllRead} className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          All ({notifications?.length || 0})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filter === 'unread' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 animate-pulse rounded bg-gray-50" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-50 p-4">
              <Bell className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Click "Check for Alerts" to scan for overdue payments, expiring leases, and more.'}
            </p>
            {filter === 'all' && (
              <Button onClick={handleGenerate} disabled={generating} className="mt-4 flex items-center gap-2">
                <RefreshCw className={cn('h-4 w-4', generating && 'animate-spin')} />
                Check for Alerts
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const config = typeConfig[n.type] || typeConfig.GENERAL;
            const Icon = config.icon;

            return (
              <Card
                key={n.id}
                className={cn(
                  'transition-all',
                  !n.isRead && 'border-l-4 border-l-blue-500',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('rounded-lg p-2.5', config.bg)}>
                      <Icon className={cn('h-5 w-5', config.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', config.bg, config.color)}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                        {!n.isRead && (
                          <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            NEW
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-medium text-gray-900">{n.title}</h3>
                      <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {n.linkUrl && (
                        <Link
                          href={n.linkUrl}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          View
                        </Link>
                      )}
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
                        >
                          Read
                        </button>
                      )}
                    </div>
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
