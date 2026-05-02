'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  FileText,
  DollarSign,
  Wrench,
  LogOut,
  Bell,
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/portal', icon: LayoutDashboard },
  { name: 'My Lease', href: '/portal/lease', icon: FileText },
  { name: 'Payments', href: '/portal/payments', icon: DollarSign },
  { name: 'Maintenance', href: '/portal/maintenance', icon: Wrench },
  { name: 'Notifications', href: '/portal/notifications', icon: Bell },
];

export function TenantSidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-gray-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Building2 className="h-7 w-7 text-emerald-600" />
        <div>
          <span className="text-xl font-bold text-gray-900">Casa Meni</span>
          <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">
            Tenant Portal
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            item.href === '/portal'
              ? pathname === '/portal'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
