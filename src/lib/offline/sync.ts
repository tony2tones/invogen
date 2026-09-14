import { createClient } from '@/lib/supabase/client';
import { getPendingInvoices, removePendingInvoice } from './db';

export async function syncPendingInvoices() {
  const pending = await getPendingInvoices();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const supabase = createClient();
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    const { items, ...invoiceFields } = record.payload;
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({ ...invoiceFields, is_offline: true })
      .select('id')
      .single();

    if (error || !invoice) {
      failed += 1;
      continue;
    }

    if (items.length > 0) {
      await supabase.from('invoice_items').insert(items.map((item) => ({ ...item, invoice_id: invoice.id })));
    }

    await removePendingInvoice(record.localId);
    synced += 1;
  }

  return { synced, failed };
}
