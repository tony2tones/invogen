'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/business-context';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClientFormDialog } from '@/components/clients/client-form-dialog';
import { ClientDetailSheet } from '@/components/clients/client-detail-sheet';
import { initials } from '@/lib/format';
import { Plus, Search, UserRound } from 'lucide-react';
import type { Client } from '@/types/database';

function ClientsPageInner() {
  const { currentBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') setFormOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('clients')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setClients(data ?? []);
        setLoading(false);
      });
  }, [currentBusiness]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [clients, query]);

  if (!currentBusiness) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or phone…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            setFormOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Client</span>
        </Button>
      </div>

      {loading && <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-10 text-center text-muted-foreground">
          <UserRound className="h-8 w-8" />
          <p className="text-sm">{query ? 'No clients match your search.' : 'No clients yet. Add your first one.'}</p>
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => {
                setDetailClient(client);
                setDetailOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left hover:bg-muted/60"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-gray-900 text-white">{initials(client.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{client.name}</p>
                <p className="truncate text-sm text-muted-foreground">{client.phone ?? client.email ?? '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <ClientFormDialog
        businessId={currentBusiness.id}
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
        onSaved={(client) => {
          setClients((prev) => {
            const exists = prev.some((c) => c.id === client.id);
            const next = exists ? prev.map((c) => (c.id === client.id ? client : c)) : [...prev, client];
            return next.sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />

      <ClientDetailSheet
        client={detailClient}
        currency={currentBusiness.currency}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(client) => {
          setDetailOpen(false);
          setEditingClient(client);
          setFormOpen(true);
        }}
        onDeleted={(id) => setClients((prev) => prev.filter((c) => c.id !== id))}
      />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsPageInner />
    </Suspense>
  );
}
