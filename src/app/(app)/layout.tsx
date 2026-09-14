'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessProvider, useBusiness } from '@/lib/contexts/business-context';
import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';
import { SidebarNav } from '@/components/sidebar-nav';
import { Loader2 } from 'lucide-react';

function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, businesses } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!loading && businesses.length === 0) {
      router.replace('/onboarding');
    }
  }, [loading, businesses.length, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (businesses.length === 0) return null;

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessProvider>
      <AppShell>{children}</AppShell>
    </BusinessProvider>
  );
}
