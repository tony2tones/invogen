'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ClientQuickAddDialog } from '@/components/clients/client-quick-add-dialog';
import { initials } from '@/lib/format';
import { Clock, Search, UserPlus } from 'lucide-react';
import type { Client } from '@/types/database';

interface ClientPickerDialogProps {
  businessId: string;
  clients: Client[];
  recentClientIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (client: Client) => void;
  onClientCreated: (client: Client) => void;
}

export function ClientPickerDialog({ businessId, clients, recentClientIds, open, onOpenChange, onSelect, onClientCreated }: ClientPickerDialogProps) {
  const [query, setQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const recent = useMemo(
    () => recentClientIds.map((id) => clients.find((c) => c.id === id)).filter((c): c is Client => !!c),
    [recentClientIds, clients]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [clients, query]);

  const showRecent = query.trim() === '' && recent.length > 0;

  const handlePick = (client: Client) => {
    onSelect(client);
    setQuery('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Select client</DialogTitle>
          </DialogHeader>
          <div className="p-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus placeholder="Search by name or phone…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-2 pb-2">
            {showRecent && (
              <div className="mb-1">
                <p className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" /> Recent
                </p>
                {recent.map((client) => (
                  <ClientRow key={client.id} client={client} onClick={() => handlePick(client)} />
                ))}
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">All clients</p>
              </div>
            )}
            {filtered.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No clients found.</p>
            )}
            {filtered.map((client) => (
              <ClientRow key={client.id} client={client} onClick={() => handlePick(client)} />
            ))}
          </div>

          <div className="border-t p-3">
            <Button variant="outline" className="w-full gap-2" onClick={() => setQuickAddOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add New Client{query.trim() ? `: "${query.trim()}"` : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ClientQuickAddDialog
        businessId={businessId}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        initialName={query.trim()}
        onSaved={(client) => {
          onClientCreated(client);
          handlePick(client);
        }}
      />
    </>
  );
}

function ClientRow({ client, onClick }: { client: Client; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted/60">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-gray-900 text-xs text-white">{initials(client.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{client.name}</p>
        <p className="truncate text-xs text-muted-foreground">{client.phone ?? client.email ?? '—'}</p>
      </div>
    </button>
  );
}
