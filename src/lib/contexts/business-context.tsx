'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BusinessProfile } from '@/types/database';

const STORAGE_KEY = 'ttd_current_business_id';

interface BusinessContextValue {
  loading: boolean;
  userId: string | null;
  businesses: BusinessProfile[];
  currentBusiness: BusinessProfile | null;
  setCurrentBusinessId: (id: string) => void;
  refresh: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data } = await supabase
      .from('business_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    const list = data ?? [];
    setBusinesses(list);

    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const validStored = stored && list.some((b) => b.id === stored) ? stored : null;
    const next = validStored ?? list[0]?.id ?? null;
    setCurrentBusinessIdState(next);
    if (next && typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const setCurrentBusinessId = useCallback((id: string) => {
    setCurrentBusinessIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const currentBusiness = businesses.find((b) => b.id === currentBusinessId) ?? null;

  return (
    <BusinessContext.Provider
      value={{ loading, userId, businesses, currentBusiness, setCurrentBusinessId, refresh: load }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within a BusinessProvider');
  return ctx;
}
