'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BusinessSwitcher } from '@/components/business-switcher';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { countPendingInvoices } from '@/lib/offline/db';
import { syncPendingInvoices } from '@/lib/offline/sync';
import { CloudOff, LogOut, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function AppHeader() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    countPendingInvoices().then(setPendingCount).catch(() => {});
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;
    (async () => {
      setSyncing(true);
      const result = await syncPendingInvoices();
      setSyncing(false);
      const remaining = await countPendingInvoices();
      setPendingCount(remaining);
      if (result.synced > 0) toast.success(`Synced ${result.synced} offline invoice${result.synced === 1 ? '' : 's'}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <BusinessSwitcher />
      <div className="flex items-center gap-1.5">
        {!isOnline && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            <CloudOff className="h-3.5 w-3.5" />
            Offline
          </span>
        )}
        {isOnline && pendingCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Syncing {pendingCount}
          </span>
        )}
        <Button asChild size="sm" className="gap-1">
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Invoice</span>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
