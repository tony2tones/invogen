'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate, initials } from '@/lib/format';
import { FilePlus2, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Client } from '@/types/database';

interface ClientDetailSheetProps {
  client: Client | null;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
  onDeleted: (clientId: string) => void;
}

export function ClientDetailSheet({ client, currency, open, onOpenChange, onEdit, onDeleted }: ClientDetailSheetProps) {
  const [loading, setLoading] = useState(true);
  const [totalInvoiced, setTotalInvoiced] = useState(0);
  const [lastInvoiceDate, setLastInvoiceDate] = useState<string | null>(null);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('invoices')
      .select('total, issue_date, status')
      .eq('client_id', client.id)
      .order('issue_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const invoices = data ?? [];
        setTotalInvoiced(invoices.filter((i) => i.status !== 'draft').reduce((sum, i) => sum + Number(i.total), 0));
        setLastInvoiceDate(invoices[0]?.issue_date ?? null);
        setInvoiceCount(invoices.length);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, client]);

  if (!client) return null;

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Client deleted');
    onDeleted(client.id);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="sr-only">Client details</SheetTitle>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gray-900 text-white">{initials(client.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{client.name}</p>
                <p className="truncate text-sm text-muted-foreground">{client.phone ?? client.email ?? 'No contact info'}</p>
              </div>
            </div>
          </SheetHeader>

          <Button asChild size="lg" className="gap-2">
            <Link href={`/invoices/new?clientId=${client.id}`}>
              <FilePlus2 className="h-4 w-4" />
              New Invoice for this Client
            </Link>
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total invoiced</p>
              <p className="text-lg font-bold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : formatCurrency(totalInvoiced, currency)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Last invoice</p>
              <p className="text-lg font-bold">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : formatDate(lastInvoiceDate)}</p>
            </div>
          </div>
          <p className="-mt-4 text-xs text-muted-foreground">{invoiceCount} invoice{invoiceCount === 1 ? '' : 's'} total</p>

          <Separator />

          <div className="space-y-2 text-sm">
            {client.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right font-medium">{client.address}</span>
              </div>
            )}
            {client.vat_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT no.</span>
                <span className="font-medium">{client.vat_number}</span>
              </div>
            )}
            {client.notes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium">{client.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-auto flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(client)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" className="flex-1 gap-2 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Existing invoices will keep their record but lose the client link.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
