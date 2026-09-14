'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { InvoiceBuilder, type InvoiceBuilderInitial } from '@/components/invoices/invoice-builder';
import { Loader2 } from 'lucide-react';
import type { BusinessProfile } from '@/types/database';

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [initial, setInitial] = useState<InvoiceBuilderInitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data: invoice, error } = await supabase.from('invoices').select('*').eq('id', params.id).single();
      if (error || !invoice || cancelled) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [businessRes, clientRes, itemsRes] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('id', invoice.business_id).single(),
        invoice.client_id ? supabase.from('clients').select('*').eq('id', invoice.client_id).single() : Promise.resolve({ data: null }),
        supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id).order('id', { ascending: true }),
      ]);

      if (cancelled) return;

      setBusiness(businessRes.data ?? null);
      setInitial({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        type: invoice.type,
        status: invoice.status,
        client: clientRes.data ?? null,
        items: (itemsRes.data ?? []).map((i) => ({
          localId: i.id,
          product_id: i.product_id,
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
        vatRate: Number(invoice.vat_rate),
        notes: invoice.notes ?? '',
        terms: invoice.terms ?? '',
        dueDate: invoice.due_date,
        issueDate: invoice.issue_date,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !business || !initial) {
    return <p className="p-6 text-center text-muted-foreground">Invoice not found.</p>;
  }

  return <InvoiceBuilder business={business} initial={initial} />;
}
