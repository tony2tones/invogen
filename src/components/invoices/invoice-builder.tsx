'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ClientPickerDialog } from './client-picker-dialog';
import { ProductPickerDialog } from './product-picker-dialog';
import { InvoiceItemRow, type BuilderLineItem } from './invoice-item-row';
import { InvoicePreview } from './invoice-preview';
import { calcInvoiceTotals } from '@/lib/invoice-calc';
import { formatCurrency, initials } from '@/lib/format';
import { buildInvoicePdfBlob, downloadBlob, uploadInvoicePdf } from '@/lib/pdf/generate';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { queuePendingInvoice } from '@/lib/offline/db';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Eye, FileDown, Loader2, MessageCircle, Package, Plus, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { BusinessProfile, Client, InvoiceStatus, InvoiceType, Product } from '@/types/database';

export interface InvoiceBuilderInitial {
  invoiceId: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  client: Client | null;
  items: BuilderLineItem[];
  vatRate: number;
  description: string;
  showDescription: boolean;
  notes: string;
  terms: string;
  dueDate: string | null;
  issueDate: string;
}

interface InvoiceBuilderProps {
  business: BusinessProfile;
  initial?: InvoiceBuilderInitial;
  defaultType?: InvoiceType;
  defaultClientId?: string;
}

function newLineItem(overrides: Partial<BuilderLineItem> = {}): BuilderLineItem {
  return { localId: crypto.randomUUID(), product_id: null, description: '', quantity: 1, unit_price: 0, ...overrides };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InvoiceBuilder({ business, initial, defaultType, defaultClientId }: InvoiceBuilderProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const mode = initial ? 'edit' : 'create';

  const [type, setType] = useState<InvoiceType>(initial?.type ?? defaultType ?? 'invoice');
  const [selectedClient, setSelectedClient] = useState<Client | null>(initial?.client ?? null);
  const [items, setItems] = useState<BuilderLineItem[]>(initial?.items ?? []);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? 15);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [showDescription, setShowDescription] = useState(initial?.showDescription ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [terms, setTerms] = useState(initial?.terms ?? 'Payment due within 7 days of invoice date.');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? plusDaysIso(7));
  const [issueDate] = useState(initial?.issueDate ?? todayIso());

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentClientIds, setRecentClientIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingAction, setSavingAction] = useState<null | 'draft' | 'download' | 'whatsapp'>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      setLoadingData(true);
      const [clientsRes, productsRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('business_id', business.id).order('name', { ascending: true }),
        supabase.from('products').select('*').eq('business_id', business.id).order('name', { ascending: true }),
        supabase
          .from('invoices')
          .select('client_id')
          .eq('business_id', business.id)
          .not('client_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      const clientList = clientsRes.data ?? [];
      setClients(clientList);
      setProducts(productsRes.data ?? []);

      const seen = new Set<string>();
      const recent: string[] = [];
      for (const row of invoicesRes.data ?? []) {
        if (row.client_id && !seen.has(row.client_id)) {
          seen.add(row.client_id);
          recent.push(row.client_id);
        }
        if (recent.length >= 5) break;
      }
      setRecentClientIds(recent);

      if (!initial && defaultClientId) {
        const preselect = clientList.find((c) => c.id === defaultClientId);
        if (preselect) setSelectedClient(preselect);
      }

      setLoadingData(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const { subtotal, vatAmount, total } = useMemo(
    () => calcInvoiceTotals(items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price })), vatRate),
    [items, vatRate]
  );

  const addCustomItem = () => setItems((prev) => [...prev, newLineItem()]);
  const addProductItem = (product: Product) =>
    setItems((prev) => [
      ...prev,
      newLineItem({ product_id: product.id, description: product.name, unit_price: product.unit_price }),
    ]);
  const updateItem = (localId: string, next: BuilderLineItem) => setItems((prev) => prev.map((i) => (i.localId === localId ? next : i)));
  const removeItem = (localId: string) => setItems((prev) => prev.filter((i) => i.localId !== localId));

  // Every catalog product's own description shows on the invoice automatically
  // wherever that product is used — not just copied into the editable
  // description field for the first item added, which used to silently drop
  // every product after the first and any manual edit the user had made.
  const productDescriptions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of products) {
      if (product.description) map[product.id] = product.description;
    }
    return map;
  }, [products]);

  const serializedItems = () =>
    items.map((i) => ({
      product_id: i.product_id,
      description: i.description || 'Item',
      quantity: i.quantity,
      unit_price: i.unit_price,
      total: Math.round(i.quantity * i.unit_price * 100) / 100,
    }));

  const handleSave = async (status: InvoiceStatus, after: 'none' | 'download' | 'whatsapp' = 'none') => {
    if (items.length === 0) {
      toast.error('Add at least one item first');
      return;
    }

    setSavingAction(after === 'none' ? 'draft' : after);

    try {
      if (!isOnline) {
        if (mode === 'edit') throw new Error('Editing requires an internet connection');
        await queuePendingInvoice({
          business_id: business.id,
          client_id: selectedClient?.id ?? null,
          invoice_number: `${business.invoice_prefix}-OFF-${Date.now().toString().slice(-6)}`,
          status: status === 'overdue' || status === 'paid' ? 'sent' : status,
          type,
          subtotal,
          vat_amount: vatAmount,
          total,
          vat_rate: vatRate,
          description: description || null,
          show_description: showDescription,
          notes: notes || null,
          terms: terms || null,
          due_date: dueDate || null,
          items: serializedItems(),
        });
        toast.success("Saved offline — it'll sync once you're back online");
        router.push('/invoices');
        return;
      }

      const supabase = createClient();
      let invoiceId = initial?.invoiceId ?? null;
      let invoiceNumber = initial?.invoiceNumber ?? '';

      if (mode === 'create') {
        const { data: number, error: numberError } = await supabase.rpc('next_invoice_number', {
          p_business_id: business.id,
          p_type: type,
        });
        if (numberError || !number) throw new Error(numberError?.message ?? 'Could not allocate an invoice number');
        invoiceNumber = number;

        const { data: invoice, error } = await supabase
          .from('invoices')
          .insert({
            business_id: business.id,
            client_id: selectedClient?.id ?? null,
            invoice_number: invoiceNumber,
            status,
            type,
            subtotal,
            vat_amount: vatAmount,
            total,
            vat_rate: vatRate,
            description: description || null,
            show_description: showDescription,
            notes: notes || null,
            terms: terms || null,
            due_date: dueDate || null,
            issue_date: issueDate,
          })
          .select()
          .single();
        if (error || !invoice) throw new Error(error?.message ?? 'Could not save invoice');
        invoiceId = invoice.id;

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(serializedItems().map((item) => ({ ...item, invoice_id: invoiceId })));
        if (itemsError) throw new Error(itemsError.message);
      } else if (invoiceId) {
        const { error } = await supabase
          .from('invoices')
          .update({
            client_id: selectedClient?.id ?? null,
            status,
            type,
            subtotal,
            vat_amount: vatAmount,
            total,
            vat_rate: vatRate,
            description: description || null,
            show_description: showDescription,
            notes: notes || null,
            terms: terms || null,
            due_date: dueDate || null,
          })
          .eq('id', invoiceId);
        if (error) throw new Error(error.message);

        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(serializedItems().map((item) => ({ ...item, invoice_id: invoiceId })));
        if (itemsError) throw new Error(itemsError.message);
      }

      toast.success(mode === 'create' ? 'Invoice saved' : 'Invoice updated');

      if ((after === 'download' || after === 'whatsapp') && invoiceId) {
        const blob = await buildInvoicePdfBlob({
          business,
          client: selectedClient,
          invoiceNumber,
          type,
          status,
          issueDate,
          dueDate: dueDate || null,
          items: serializedItems(),
          subtotal,
          vatAmount,
          total,
          vatRate,
          description: description || null,
          showDescription,
          productDescriptions,
          notes: notes || null,
          terms: terms || null,
        });

        if (after === 'download') {
          downloadBlob(blob, `${invoiceNumber}.pdf`);
        } else {
          const url = await uploadInvoicePdf(business.id, invoiceId, blob);
          const label = type === 'quote' ? 'quote' : 'invoice';
          const message = `Hi ${selectedClient?.name ?? 'there'}, here is your ${label} ${invoiceNumber} from ${business.name} for ${formatCurrency(
            total,
            business.currency
          )}.\n${url}`;
          window.open(buildWhatsAppLink(selectedClient?.phone, message), '_blank');
        }
      }

      router.push(`/invoices/${invoiceId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSavingAction(null);
    }
  };

  const previewNode = (
    <InvoicePreview
      business={business}
      client={selectedClient}
      invoiceNumber={initial?.invoiceNumber ?? 'DRAFT'}
      type={type}
      issueDate={issueDate}
      dueDate={dueDate || null}
      items={items}
      subtotal={subtotal}
      vatAmount={vatAmount}
      vatRate={vatRate}
      total={total}
      description={description}
      showDescription={showDescription}
      productDescriptions={productDescriptions}
      notes={notes}
      terms={terms}
    />
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[1fr_420px] lg:p-6">
      <div className="space-y-5">
        <Tabs value={type} onValueChange={(v) => setType(v as InvoiceType)}>
          <TabsList>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="quote">Quote</TabsTrigger>
          </TabsList>
        </Tabs>

        <section className="space-y-2">
          <Label>Client</Label>
          {selectedClient ? (
            <button
              onClick={() => setClientPickerOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-gray-900 text-white">{initials(selectedClient.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{selectedClient.name}</p>
                <p className="truncate text-sm text-muted-foreground">{selectedClient.phone ?? selectedClient.email ?? '—'}</p>
              </div>
              <span className="text-sm font-medium text-primary">Change</span>
            </button>
          ) : (
            <button
              onClick={() => setClientPickerOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed p-4 text-muted-foreground hover:bg-muted/40"
            >
              <UserRound className="h-4 w-4" />
              Select client
            </button>
          )}
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description</Label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Show on invoice
              <Switch checked={showDescription} onCheckedChange={setShowDescription} />
            </label>
          </div>
          {showDescription && (
            <Textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional summary of the work. Catalog items with their own description show automatically below this."
            />
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Items</Label>
            <span className="text-sm text-muted-foreground">
              {items.length} item{items.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <InvoiceItemRow
                key={item.localId}
                item={item}
                currency={business.currency}
                onChange={(next) => updateItem(item.localId, next)}
                onRemove={() => removeItem(item.localId)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setProductPickerOpen(true)}>
              <Package className="h-4 w-4" />
              Add from Catalog
            </Button>
            <Button type="button" variant="outline" className="flex-1 gap-2" onClick={addCustomItem}>
              <Plus className="h-4 w-4" />
              Add Custom Item
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="vat-rate">VAT rate (%)</Label>
            <Input id="vat-rate" type="number" step="0.01" min="0" value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due-date">Due date</Label>
            <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </section>

        <section className="rounded-lg border bg-background p-3">
          <div className="flex justify-between py-1 text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, business.currency)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm text-muted-foreground">
            <span>VAT ({vatRate}%)</span>
            <span>{formatCurrency(vatAmount, business.currency)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(total, business.currency)}</span>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note to the client" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Terms</Label>
            <Textarea id="terms" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </section>

        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="secondary" className="w-full gap-2 lg:hidden">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Preview</SheetTitle>
            </SheetHeader>
            <div className="mt-3">{previewNode}</div>
          </SheetContent>
        </Sheet>

        <div className="sticky bottom-16 z-10 flex flex-wrap gap-2 rounded-lg border bg-background/95 p-3 backdrop-blur md:bottom-0">
          <Button type="button" variant="outline" className="flex-1 gap-2" disabled={!!savingAction} onClick={() => handleSave('draft')}>
            {savingAction === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </Button>
          <Button type="button" variant="outline" className="flex-1 gap-2" disabled={!!savingAction} onClick={() => handleSave('sent', 'download')}>
            {savingAction === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Save &amp; PDF
          </Button>
          <Button type="button" className="flex-1 gap-2" disabled={!!savingAction} onClick={() => handleSave('sent', 'whatsapp')}>
            {savingAction === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Save &amp; WhatsApp
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-20">{previewNode}</div>
      </div>

      {!loadingData && (
        <>
          <ClientPickerDialog
            businessId={business.id}
            clients={clients}
            recentClientIds={recentClientIds}
            open={clientPickerOpen}
            onOpenChange={setClientPickerOpen}
            onSelect={setSelectedClient}
            onClientCreated={(client) => setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)))}
          />
          <ProductPickerDialog
            products={products}
            currency={business.currency}
            open={productPickerOpen}
            onOpenChange={setProductPickerOpen}
            onSelect={addProductItem}
          />
        </>
      )}
    </div>
  );
}
