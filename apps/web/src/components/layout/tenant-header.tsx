'use client';

import { useAuth } from '@/hooks/use-auth';

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

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-sm font-medium text-gray-500">Welcome back,</h2>
        <p className="text-lg font-semibold text-gray-900">
          {user?.name || 'Tenant'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-medium">
          {initials}
        </div>
        {user && (
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">Tenant</p>
          </div>
        )}
      </div>
    </header>
  );
}
