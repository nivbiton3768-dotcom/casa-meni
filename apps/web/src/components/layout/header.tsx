'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useApi } from '@/hooks/use-api';
import { apiFetch, cn } from '@/lib/utils';
import { Bell, Search, X, CheckCheck } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  type: 'property' | 'unit' | 'tenant' | 'vendor' | 'maintenance';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const searchTypeLabels: Record<string, string> = {
  property: 'Properties',
  unit: 'Units',
  tenant: 'Tenants',
  vendor: 'Vendors',
  maintenance: 'Maintenance',
};

const searchTypeColors: Record<string, string> = {
  property: 'bg-emerald-100 text-emerald-700',
  unit: 'bg-sky-100 text-sky-700',
  tenant: 'bg-violet-100 text-violet-700',
  vendor: 'bg-orange-100 text-orange-700',
  maintenance: 'bg-rose-100 text-rose-700',
};

const typeColors: Record<string, string> = {
  PAYMENT_OVERDUE: 'bg-red-100 text-red-700',
  LEASE_EXPIRING: 'bg-amber-100 text-amber-700',
  MAINTENANCE_UPDATE: 'bg-blue-100 text-blue-700',
  RENOVATION_BUDGET: 'bg-orange-100 text-orange-700',
  RESERVATION_UPCOMING: 'bg-purple-100 text-purple-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

const typeLabels: Record<string, string> = {
  PAYMENT_OVERDUE: 'Overdue',
  LEASE_EXPIRING: 'Lease',
  MAINTENANCE_UPDATE: 'Maintenance',
  RENOVATION_BUDGET: 'Budget',
  RESERVATION_UPCOMING: 'Booking',
  GENERAL: 'Info',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function Header() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: unreadData, refetch: refetchCount } =
    useApi<{ unreadCount: number }>('/notifications/unread-count');
  const { data: notifications, refetch: refetchNotifs } =
    useApi<Notification[]>(open ? '/notifications' : null);

  const unreadCount = unreadData?.unreadCount || 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch<SearchResult[]>(
          '/search?q=' + encodeURIComponent(searchQuery),
        );
        setSearchResults(res);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    if (searchOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  const grouped = searchResults.reduce<Record<string, SearchResult[]>>(
    (acc, r) => {
      (acc[r.type] ??= []).push(r);
      return acc;
    },
    {},
  );

  useEffect(() => {
    const interval = setInterval(() => refetchCount(), 30000);
    return () => clearInterval(interval);
  }, [refetchCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
    refetchCount();
    refetchNotifs();
  };

  const handleMarkAllRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    refetchCount();
    refetchNotifs();
  };

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '..';

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties, tenants, jobs..."
            className="h-9 w-80 rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
          />

          {searchOpen && (
            <div className="absolute left-0 top-full mt-2 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50">
              {searchLoading ? (
                <div className="py-6 text-center text-sm text-gray-500">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">No results</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {Object.entries(grouped).map(([type, items]) => (
                    <div key={type}>
                      <div className="sticky top-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {searchTypeLabels[type] || type}
                      </div>
                      {items.map((result) => (
                        <Link
                          key={result.id}
                          href={result.url}
                          onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                        >
                          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', searchTypeColors[result.type])}>
                            {searchTypeLabels[result.type]?.slice(0, -1) || result.type}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{result.title}</p>
                            <p className="truncate text-xs text-gray-500">{result.subtitle}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setOpen(!open); if (!open) refetchNotifs(); }}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {!notifications || notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No notifications</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50',
                        !n.isRead && 'bg-blue-50/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                typeColors[n.type] || typeColors.GENERAL,
                              )}
                            >
                              {typeLabels[n.type] || 'Info'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          {n.linkUrl ? (
                            <Link
                              href={n.linkUrl}
                              onClick={() => { handleMarkRead(n.id); setOpen(false); }}
                              className="mt-1 block text-sm font-medium text-gray-900 hover:text-blue-600"
                            >
                              {n.title}
                            </Link>
                          ) : (
                            <p className="mt-1 text-sm font-medium text-gray-900">{n.title}</p>
                          )}
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="mt-1 shrink-0 rounded-full bg-blue-500 h-2 w-2"
                            title="Mark as read"
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t px-4 py-2">
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {initials}
          </div>
          {user && (
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user.role.toLowerCase().replace(/_/g, ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
