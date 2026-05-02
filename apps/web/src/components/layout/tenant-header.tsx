'use client';

import { useAuth } from '@/hooks/use-auth';
import { Building2, LogOut } from 'lucide-react';

export function TenantHeader() {
  const { user } = useAuth();

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '..';

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2 lg:hidden">
          <Building2 className="h-6 w-6 text-emerald-600" />
          <span className="text-base font-bold text-gray-900">Casa Meni</span>
        </div>
        <div className="hidden min-w-0 lg:block">
          <h2 className="text-sm font-medium text-gray-500">Welcome back,</h2>
          <p className="truncate text-lg font-semibold text-gray-900">
            {user?.name || 'Tenant'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium text-white">
          {initials}
        </div>
        {user && (
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">Tenant</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
