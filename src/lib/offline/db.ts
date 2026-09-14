import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface PendingInvoicePayload {
  business_id: string;
  client_id: string | null;
  invoice_number: string;
  status: 'draft' | 'sent';
  type: 'invoice' | 'quote';
  subtotal: number;
  vat_amount: number;
  total: number;
  vat_rate: number;
  notes: string | null;
  terms: string | null;
  due_date: string | null;
  items: { product_id: string | null; description: string; quantity: number; unit_price: number; total: number }[];
}

interface PendingInvoiceRecord {
  localId: string;
  payload: PendingInvoicePayload;
  createdAt: number;
}

interface InvoiceAppDB extends DBSchema {
  pending_invoices: {
    key: string;
    value: PendingInvoiceRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<InvoiceAppDB>> | null = null;

function getDb() {
  if (typeof window === 'undefined') throw new Error('idb is only available in the browser');
  if (!dbPromise) {
    dbPromise = openDB<InvoiceAppDB>('invoice-ttd', 1, {
      upgrade(db) {
        db.createObjectStore('pending_invoices', { keyPath: 'localId' });
      },
    });
  }
  return dbPromise;
}

export async function queuePendingInvoice(payload: PendingInvoicePayload) {
  const db = await getDb();
  const localId = crypto.randomUUID();
  await db.put('pending_invoices', { localId, payload, createdAt: Date.now() });
  return localId;
}

export async function getPendingInvoices() {
  const db = await getDb();
  return db.getAll('pending_invoices');
}

export async function removePendingInvoice(localId: string) {
  const db = await getDb();
  await db.delete('pending_invoices', localId);
}

export async function countPendingInvoices() {
  const db = await getDb();
  return db.count('pending_invoices');
}
