'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { SidebarContent } from './sidebar';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} side="left">
        <div className="flex h-full flex-col">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}
