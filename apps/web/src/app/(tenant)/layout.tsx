import { TenantSidebar } from '@/components/layout/tenant-sidebar';
import { TenantHeader } from '@/components/layout/tenant-header';
import { TenantBottomNav } from '@/components/layout/tenant-bottom-nav';
import { ToastProvider } from '@/components/ui/toast';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <TenantSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TenantHeader />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
            {children}
          </main>
          <TenantBottomNav />
        </div>
      </div>
    </ToastProvider>
  );
}
