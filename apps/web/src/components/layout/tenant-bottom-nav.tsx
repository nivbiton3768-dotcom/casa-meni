'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Wrench,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { name: 'Home', href: '/portal', icon: LayoutDashboard },
  { name: 'Lease', href: '/portal/lease', icon: FileText },
  { name: 'Pay', href: '/portal/payments', icon: DollarSign },
  { name: 'Repairs', href: '/portal/maintenance', icon: Wrench },
  { name: 'Alerts', href: '/portal/notifications', icon: Bell },
];

export function TenantBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/portal'
            ? pathname === '/portal'
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-emerald-600'
                : 'text-gray-500 active:text-gray-700',
            )}
          >
            <tab.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
