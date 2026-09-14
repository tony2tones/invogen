'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { statusBadgeVariant } from '@/lib/invoice-status';
import { buildInvoicePdfBlob, downloadBlob, uploadInvoicePdf } from '@/lib/pdf/generate';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { ChevronDown, FileDown, Loader2, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import type { BusinessProfile, Client, Invoice, InvoiceItem, InvoiceStatus } from '@/types/database';

const statusOptions: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue'];

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | 'download' | 'whatsapp' | 'status' | 'delete'>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data: invoiceData, error } = await supabase.from('invoices').select('*').eq('id', params.id).single();
      if (cancelled) return;
      if (error || !invoiceData) {
        setLoading(false);
        return;
      }
      setInvoice(invoiceData);

      const [businessRes, clientRes, itemsRes] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('id', invoiceData.business_id).single(),
        invoiceData.client_id
          ? supabase.from('clients').select('*').eq('id', invoiceData.client_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('invoice_items').select('*').eq('invoice_id', invoiceData.id).order('id', { ascending: true }),
      ]);

      if (cancelled) return;
      setBusiness(businessRes.data ?? null);
      setClient(clientRes.data ?? null);
      setItems(itemsRes.data ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleStatusChange = async (status: InvoiceStatus) => {
    if (!invoice) return;
    setBusy('status');
    const supabase = createClient();
    const { error } = await supabase.from('invoices').update({ status }).eq('id', invoice.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInvoice({ ...invoice, status });
    toast.success(`Marked as ${status}`);
  };

  const handleDownload = async () => {
    if (!invoice || !business) return;
    setBusy('download');
    try {
      const blob = await buildInvoicePdfBlob({
        business,
        client,
        invoiceNumber: invoice.invoice_number,
        type: invoice.type,
        status: invoice.status,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        items,
        subtotal: Number(invoice.subtotal),
        vatAmount: Number(invoice.vat_amount),
        total: Number(invoice.total),
        vatRate: Number(invoice.vat_rate),
        description: invoice.description,
        notes: invoice.notes,
        terms: invoice.terms,
      });
      downloadBlob(blob, `${invoice.invoice_number}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate PDF');
    } finally {
      setBusy(null);
    }
  };

  const handleWhatsApp = async () => {
    if (!invoice || !business) return;
    setBusy('whatsapp');
    try {
      const blob = await buildInvoicePdfBlob({
        business,
        client,
        invoiceNumber: invoice.invoice_number,
        type: invoice.type,
        status: invoice.status,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        items,
        subtotal: Number(invoice.subtotal),
        vatAmount: Number(invoice.vat_amount),
        total: Number(invoice.total),
        vatRate: Number(invoice.vat_rate),
        description: invoice.description,
        notes: invoice.notes,
        terms: invoice.terms,
      });
      const url = await uploadInvoicePdf(business.id, invoice.id, blob);
      const label = invoice.type === 'quote' ? 'quote' : 'invoice';
      const message = `Hi ${client?.name ?? 'there'}, here is your ${label} ${invoice.invoice_number} from ${business.name} for ${formatCurrency(
        Number(invoice.total),
        business.currency
      )}.\n${url}`;
      window.open(buildWhatsAppLink(client?.phone, message), '_blank');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not share via WhatsApp');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setBusy('delete');
    const supabase = createClient();
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Invoice deleted');
    router.push('/invoices');
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice || !business) {
    return <p className="p-6 text-center text-muted-foreground">Invoice not found.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 lg:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{invoice.invoice_number}</h1>
            <Badge variant={statusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{invoice.type === 'quote' ? 'Quote' : 'Invoice'}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" disabled={busy === 'status'}>
                {busy === 'status' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Status'}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statusOptions.map((status) => (
                <DropdownMenuItem key={status} onClick={() => handleStatusChange(status)}>
                  Mark as {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={`/invoices/${invoice.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <InvoicePreview
            business={business}
            client={client}
            invoiceNumber={invoice.invoice_number}
            type={invoice.type}
            issueDate={invoice.issue_date}
            dueDate={invoice.due_date}
            items={items.map((i) => ({ localId: i.id, product_id: i.product_id, description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }))}
            subtotal={Number(invoice.subtotal)}
            vatAmount={Number(invoice.vat_amount)}
            vatRate={Number(invoice.vat_rate)}
            total={Number(invoice.total)}
            description={invoice.description ?? ''}
            notes={invoice.notes ?? ''}
            terms={invoice.terms ?? ''}
          />

          <div className="flex gap-2 lg:hidden">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload} disabled={!!busy}>
              {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Download PDF
            </Button>
            <Button className="flex-1 gap-2" onClick={handleWhatsApp} disabled={!!busy}>
              {busy === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Share WhatsApp
            </Button>
          </div>
        </div>

        <div className="hidden space-y-4 lg:block">
          <div className="sticky top-20 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{invoice.invoice_number}</h1>
                <Badge variant={statusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{invoice.type === 'quote' ? 'Quote' : 'Invoice'}</p>
            </div>

            <div className="space-y-2 rounded-lg border bg-background p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between gap-1" disabled={busy === 'status'}>
                    {busy === 'status' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Change status'}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                  {statusOptions.map((status) => (
                    <DropdownMenuItem key={status} onClick={() => handleStatusChange(status)}>
                      Mark as {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild variant="outline" className="w-full gap-2">
                <Link href={`/invoices/${invoice.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full gap-2" onClick={handleDownload} disabled={!!busy}>
                {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button className="w-full gap-2" onClick={handleWhatsApp} disabled={!!busy}>
                {busy === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Share WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {invoice.invoice_number}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy === 'delete'} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy === 'delete' && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
