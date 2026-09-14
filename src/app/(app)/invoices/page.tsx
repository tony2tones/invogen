'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/business-context';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/format';
import { statusBadgeVariant } from '@/lib/invoice-status';
import { FileText, Plus, Search } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@/types/database';

type InvoiceRow = Invoice & { client_name: string | null };

const filters: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export default function InvoicesPage() {
  const { currentBusiness } = useBusiness();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('invoices')
      .select('*, clients(name)')
      .eq('business_id', currentBusiness.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = ((data ?? []) as unknown as (Invoice & { clients: { name: string } | null })[]).map((i) => ({
          ...i,
          client_name: i.clients?.name ?? null,
        }));
        setInvoices(rows);
        setLoading(false);
      });
  }, [currentBusiness]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (!q) return true;
      return i.invoice_number.toLowerCase().includes(q) || i.client_name?.toLowerCase().includes(q);
    });
  }, [invoices, query, statusFilter]);

  if (!currentBusiness) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search invoice # or client…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Link>
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')}>
        <TabsList className="flex-wrap">
          {filters.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="divide-y rounded-lg border bg-background">
        {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p className="text-sm">No invoices found.</p>
          </div>
        )}
        {filtered.map((invoice) => (
          <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/60">
            <div className="min-w-0">
              <p className="truncate font-medium">{invoice.client_name ?? 'No client'}</p>
              <p className="text-xs text-muted-foreground">
                {invoice.invoice_number} · {formatDate(invoice.issue_date)} · {invoice.type === 'quote' ? 'Quote' : 'Invoice'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold">{formatCurrency(Number(invoice.total), currentBusiness.currency)}</span>
              <Badge variant={statusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
