'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Wrench,
  DollarSign,
  Users,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  Hammer,
  HardHat,
  PieChart,
  BarChart3,
  Bell,
  PenLine,
  Landmark,
  Globe,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  KeyRound,
  Boxes,
  Webhook,
  Calculator,
  Banknote,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Deal Pipeline', href: '/deals', icon: TrendingUp },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Reservations', href: '/reservations', icon: CalendarDays },
  { name: 'Channels', href: '/channels', icon: Globe },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Preventive', href: '/preventive', icon: ShieldCheck },
  { name: 'Assets', href: '/assets', icon: Boxes },
  { name: 'Smart Locks', href: '/smart-locks', icon: KeyRound },
  { name: 'Emergency', href: '/emergency', icon: AlertTriangle },
  { name: 'Renovations', href: '/renovations', icon: Hammer },
  { name: 'Transactions', href: '/transactions', icon: DollarSign },
  { name: 'Accounting', href: '/accounting', icon: Calculator },
  { name: 'Trust Accounts', href: '/trust', icon: ShieldCheck },
  { name: 'Loans', href: '/loans', icon: Banknote },
  { name: '1099s', href: '/tax-1099', icon: FileText },
  { name: 'Banking', href: '/banking', icon: Landmark },
  { name: 'AI Tools', href: '/ai', icon: Cpu },
  { name: 'Capital Calls', href: '/capital-calls', icon: Wallet },
  { name: 'Investors', href: '/investors', icon: PieChart },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Cost Analytics', href: '/cost-analytics', icon: TrendingUp },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Vendors', href: '/vendors', icon: HardHat },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'E-Signatures', href: '/signing', icon: PenLine },
  { name: 'Webhooks', href: '/webhooks', icon: Webhook },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Building2 className="h-7 w-7 text-blue-600" />
        <span className="text-xl font-bold text-gray-900">Casa Meni</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
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
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-gray-200 bg-white lg:flex">
      <SidebarContent />
    </aside>
  );
}
