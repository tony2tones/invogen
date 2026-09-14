'use client';

import { formatCurrency, formatDateLong } from '@/lib/format';
import { hasBankingDetails } from '@/lib/banking';
import { buildDescriptionLines } from '@/lib/invoice-description';
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
  description: string;
  showDescription: boolean;
  productDescriptions: Record<string, string>;
  notes: string;
  terms: string;
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 font-bold">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function InvoicePreview({ business, client, invoiceNumber, type, issueDate, dueDate, items, subtotal, vatAmount, vatRate, total, description, showDescription, productDescriptions, notes, terms }: InvoicePreviewProps) {
  const descriptionLines = showDescription ? buildDescriptionLines(description, items, productDescriptions) : [];
  const showBreakdown = vatAmount > 0;

  return (
    <div className="mx-auto max-w-[794px] rounded-sm border bg-white p-10 font-serif text-[13px] leading-relaxed text-gray-900 shadow-md sm:p-12">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="mb-2 text-xl font-bold text-blue-700">{type === 'quote' ? 'Quotation' : 'Tax Invoice'}</p>
          <MetaLine label="Business:" value={business.name} />
          {business.email && <MetaLine label="Email:" value={business.email} />}
          {business.phone && <MetaLine label="Phone:" value={business.phone} />}
          {business.vat_number && <MetaLine label="VAT No:" value={business.vat_number} />}
          <MetaLine label={type === 'quote' ? 'Quote No:' : 'Invoice No:'} value={invoiceNumber || 'DRAFT'} />
          <MetaLine label="Date:" value={formatDateLong(issueDate)} />
          {dueDate && <MetaLine label="Due date:" value={formatDateLong(dueDate)} />}
        </div>
        {business.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo_url} alt={business.name} className="h-16 w-16 shrink-0 object-contain" />
        )}
      </div>

      <p className="mb-1 mt-4 text-[15px] font-bold text-blue-700">Client</p>
      <p className="font-bold">{client?.name ?? 'No client selected'}</p>
      {client?.address && <p className="text-gray-600">{client.address}</p>}
      {client?.email && <p className="text-gray-600">{client.email}</p>}
      {client?.phone && <p className="text-gray-600">{client.phone}</p>}
      {client?.vat_number && <p className="text-gray-600">VAT: {client.vat_number}</p>}

      {descriptionLines.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-[15px] font-bold text-blue-700">Description:</p>
          <div className="space-y-1">
            {descriptionLines.map((line, i) => (
              <p key={i}>{line.startsWith('-') ? line : `- ${line}`}</p>
            ))}
          </div>
        </>
      )}

      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-900 text-left">
            <th className="pb-1.5 font-bold">Item</th>
            <th className="pb-1.5 text-right font-bold">Qty</th>
            <th className="pb-1.5 text-right font-bold">Price</th>
            <th className="pb-1.5 text-right font-bold">Amount</th>
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
            <tr key={item.localId} className="border-b border-gray-200">
              <td className="py-1.5 pr-2">{item.description || '—'}</td>
              <td className="py-1.5 text-right">{item.quantity}</td>
              <td className="py-1.5 text-right">{formatCurrency(item.unit_price, business.currency)}</td>
              <td className="py-1.5 text-right">{formatCurrency(item.quantity * item.unit_price, business.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-3 w-52 space-y-1">
        {showBreakdown && (
          <>
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, business.currency)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT ({vatRate}%)</span>
              <span>{formatCurrency(vatAmount, business.currency)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between border-t border-gray-900 pt-1.5 font-bold">
          <span>{type === 'quote' ? 'Total' : 'Amount Due'}</span>
          <span>{formatCurrency(total, business.currency)}</span>
        </div>
      </div>

      {(notes || terms) && (
        <div className="mt-5 space-y-3">
          {notes && (
            <div>
              <p className="mb-0.5 text-[15px] font-bold text-blue-700">Notes</p>
              <p className="whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          {terms && (
            <div>
              <p className="mb-0.5 text-[15px] font-bold text-blue-700">Terms</p>
              <p className="whitespace-pre-wrap">{terms}</p>
            </div>
          )}
        </div>
      )}

      {hasBankingDetails(business) && (
        <div className="mt-5">
          <p className="mb-1 text-[15px] font-bold text-blue-700">Bank Details:</p>
          <div>
            {business.bank_name && (
              <div className="flex border-b border-gray-200 py-1">
                <span className="w-32 shrink-0 text-gray-500">Bank</span>
                <span>{business.bank_name}</span>
              </div>
            )}
            {business.account_holder && (
              <div className="flex border-b border-gray-200 py-1">
                <span className="w-32 shrink-0 text-gray-500">Account holder</span>
                <span>{business.account_holder}</span>
              </div>
            )}
            {business.account_number && (
              <div className="flex border-b border-gray-200 py-1">
                <span className="w-32 shrink-0 text-gray-500">Account number</span>
                <span>{business.account_number}</span>
              </div>
            )}
            {business.branch_code && (
              <div className="flex border-b border-gray-200 py-1">
                <span className="w-32 shrink-0 text-gray-500">Branch code</span>
                <span>{business.branch_code}</span>
              </div>
            )}
            {business.account_type && (
              <div className="flex border-b border-gray-200 py-1">
                <span className="w-32 shrink-0 text-gray-500">Account type</span>
                <span>{business.account_type}</span>
              </div>
            )}
            {business.swift_code && (
              <div className="flex border-b border-gray-200 py-1">
                <span className="w-32 shrink-0 text-gray-500">SWIFT/BIC</span>
                <span>{business.swift_code}</span>
              </div>
            )}
            <div className="flex border-b border-gray-200 py-1">
              <span className="w-32 shrink-0 text-gray-500">Reference</span>
              <span>Please use {invoiceNumber || 'this invoice number'} as your payment reference</span>
            </div>
          </div>
        </div>
      )}

      <p className="mt-6">Thank you for your support and business.</p>

      <p className="mt-10 text-center text-[10px] text-gray-300">Powered by Two Tones Digital</p>
    </div>
  );
}
