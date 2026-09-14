'use client';

import { formatCurrency, formatDate } from '@/lib/format';
import { hasBankingDetails } from '@/lib/banking';
import type { BusinessProfile, Client, InvoiceType } from '@/types/database';
import type { BuilderLineItem } from './invoice-item-row';

interface InvoicePreviewProps {
  business: BusinessProfile;
  client: Client | null;
  invoiceNumber: string;
  type: InvoiceType;
  issueDate: string;
  dueDate: string | null;
  items: BuilderLineItem[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  notes: string;
  terms: string;
}

export function InvoicePreview({ business, client, invoiceNumber, type, issueDate, dueDate, items, subtotal, vatAmount, vatRate, total, notes, terms }: InvoicePreviewProps) {
  return (
    <div className="rounded-lg border bg-white p-6 text-sm text-gray-900 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          {business.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt={business.name} className="mb-2 max-h-14 max-w-32 object-contain" />
          )}
          <p className="font-bold">{business.name}</p>
          {business.address && <p className="text-xs text-gray-500">{business.address}</p>}
          {business.phone && <p className="text-xs text-gray-500">{business.phone}</p>}
          {business.email && <p className="text-xs text-gray-500">{business.email}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold uppercase">{type === 'quote' ? 'Quotation' : 'Tax Invoice'}</p>
          <p className="text-xs text-gray-500">{invoiceNumber || 'DRAFT'}</p>
          <p className="text-xs text-gray-500">Issued {formatDate(issueDate)}</p>
          {dueDate && <p className="text-xs text-gray-500">Due {formatDate(dueDate)}</p>}
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">{type === 'quote' ? 'Quoted to' : 'Billed to'}</p>
        <p className="font-semibold">{client?.name ?? 'No client selected'}</p>
        {client?.address && <p className="text-xs text-gray-500">{client.address}</p>}
        {client?.email && <p className="text-xs text-gray-500">{client.email}</p>}
        {client?.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-gray-900 text-left text-[10px] uppercase text-gray-400">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 text-right font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Price</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-400">
                No items yet
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.localId} className="border-b border-gray-100">
              <td className="py-2 pr-2">{item.description || '—'}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{formatCurrency(item.unit_price, business.currency)}</td>
              <td className="py-2 text-right font-medium">{formatCurrency(item.quantity * item.unit_price, business.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-4 w-48 space-y-1 text-xs">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal, business.currency)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>VAT ({vatRate}%)</span>
          <span>{formatCurrency(vatAmount, business.currency)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-900 pt-1.5 text-sm font-bold">
          <span>Total</span>
          <span>{formatCurrency(total, business.currency)}</span>
        </div>
      </div>

      {(notes || terms) && (
        <div className="mt-6 space-y-2 text-xs text-gray-600">
          {notes && (
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400">Notes</p>
              <p className="whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          {terms && (
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-gray-400">Terms</p>
              <p className="whitespace-pre-wrap">{terms}</p>
            </div>
          )}
        </div>
      )}

      {hasBankingDetails(business) && (
        <div className="mt-6 rounded border border-gray-200 p-3 text-xs text-gray-600">
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-400">Banking details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {business.bank_name && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Bank</span>
                <span className="font-medium">{business.bank_name}</span>
              </div>
            )}
            {business.account_holder && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Account holder</span>
                <span className="font-medium">{business.account_holder}</span>
              </div>
            )}
            {business.account_number && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Acc no.</span>
                <span className="font-medium">{business.account_number}</span>
              </div>
            )}
            {business.branch_code && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Branch code</span>
                <span className="font-medium">{business.branch_code}</span>
              </div>
            )}
            {business.account_type && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Account type</span>
                <span className="font-medium">{business.account_type}</span>
              </div>
            )}
            {business.swift_code && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">SWIFT/BIC</span>
                <span className="font-medium">{business.swift_code}</span>
              </div>
            )}
          </div>
          <p className="mt-1.5 border-t border-gray-100 pt-1.5">
            Please use <span className="font-semibold">{invoiceNumber || 'this invoice number'}</span> as your payment reference.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-[9px] text-gray-300">Powered by Two Tones Digital</p>
    </div>
  );
}
