'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch, cn } from '@/lib/utils';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeColors: Record<string, string> = {
  PAYMENT_OVERDUE: 'border-l-red-500',
  LEASE_EXPIRING: 'border-l-amber-500',
  MAINTENANCE_UPDATE: 'border-l-blue-500',
  GENERAL: 'border-l-gray-400',
};

export default function TenantNotificationsPage() {
  const { data: notifications, loading, refetch } = useApi<Notification[]>('/notifications');

  const handleMarkAllRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    refetch();
  };

  const handleMarkRead = async (id: string) => {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    refetch();
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              onClick={handleMarkAllRead}
              className="flex w-full items-center justify-center gap-2 md:w-auto"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-12 animate-pulse rounded bg-gray-100" /></CardContent></Card>
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center px-4 py-16 text-center">
            <Bell className="h-10 w-10 text-gray-300" />
            <h3 className="mt-4 font-semibold text-gray-900">No notifications</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                'border-l-4 transition-all',
                typeColors[n.type] || typeColors.GENERAL,
                !n.isRead && 'bg-blue-50/30',
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-gray-900">{n.title}</p>
                    <p className="mt-0.5 break-words text-sm text-gray-500 line-clamp-3">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 whitespace-nowrap rounded border px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Read
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
