import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InvoiceDocument } from './invoice-document';
import type { BusinessProfile, Client, InvoiceItem, InvoiceType } from '@/types/database';

export interface InvoicePdfInput {
  business: BusinessProfile;
  client: Client | null;
  invoiceNumber: string;
  type: InvoiceType;
  status: string;
  issueDate: string;
  dueDate: string | null;
  items: Pick<InvoiceItem, 'product_id' | 'description' | 'quantity' | 'unit_price' | 'total'>[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  description: string | null;
  showDescription: boolean;
  productDescriptions: Record<string, string>;
  notes: string | null;
  terms: string | null;
}

export async function buildInvoicePdfBlob(input: InvoicePdfInput): Promise<Blob> {
  const doc = createElement(InvoiceDocument, input);
  // @react-pdf/renderer's document type is generic over its own element shape;
  // createElement's inferred type doesn't line up 1:1, so the instance is cast at the call site.
  const instance = pdf(doc as Parameters<typeof pdf>[0]);
  return instance.toBlob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function uploadInvoicePdf(businessId: string, invoiceId: string, blob: Blob) {
  const supabase = createClient();
  const path = `${businessId}/${invoiceId}.pdf`;
  const { error } = await supabase.storage.from('invoice-pdfs').upload(path, blob, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('invoice-pdfs').getPublicUrl(path);
  return data.publicUrl;
}
