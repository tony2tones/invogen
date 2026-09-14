import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { hasBankingDetails } from '@/lib/banking';
import { formatDateLong } from '@/lib/format';
import { buildDescriptionLines } from '@/lib/invoice-description';
import type { BusinessProfile, Client, InvoiceItem, InvoiceType } from '@/types/database';

Font.registerHyphenationCallback((word) => [word]);

const ACCENT = '#1a56db';
const MUTED = '#6b7280';
const BORDER = '#d1d5db';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, fontFamily: 'Times-Roman', color: '#111827', lineHeight: 1.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  docTitle: { fontSize: 20, fontWeight: 700, color: ACCENT, marginBottom: 8 },
  metaLine: { flexDirection: 'row', marginBottom: 2 },
  metaLabel: { fontWeight: 700, width: 100 },
  logo: { width: 64, height: 64, objectFit: 'contain' },
  sectionHeading: { fontSize: 11, fontWeight: 700, color: ACCENT, marginBottom: 4, marginTop: 16 },
  muted: { color: MUTED },
  bulletLine: { marginBottom: 3 },
  table: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#111827' },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827', paddingVertical: 5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingVertical: 5 },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.3, textAlign: 'right' },
  colTotal: { flex: 1.3, textAlign: 'right' },
  tableHeaderText: { fontWeight: 700 },
  totals: { marginTop: 10, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: '#111827' },
  grandTotalLabel: { fontWeight: 700 },
  grandTotalValue: { fontWeight: 700 },
  notesBlock: { marginTop: 4 },
  bankRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingVertical: 4 },
  bankLabel: { width: 130, color: MUTED },
  bankValue: { flex: 1 },
  thanks: { marginTop: 18 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: MUTED },
});

function formatMoney(amount: number, currency: string) {
  const symbol = currency === 'ZAR' ? 'R' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';
  return `${symbol}${amount.toFixed(2)}`;
}

interface InvoiceDocumentProps {
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

export function InvoiceDocument({
  business,
  client,
  invoiceNumber,
  type,
  issueDate,
  dueDate,
  items,
  subtotal,
  vatAmount,
  total,
  vatRate,
  description,
  showDescription,
  productDescriptions,
  notes,
  terms,
}: InvoiceDocumentProps) {
  const title = type === 'quote' ? 'Quotation' : 'Tax Invoice';
  const currency = business.currency || 'ZAR';
  const descriptionLines = showDescription ? buildDescriptionLines(description ?? '', items, productDescriptions) : [];
  // A quote with no VAT (the common freelance case) doesn't need the extra
  // subtotal/VAT rows — a single bold total reads cleaner, matching how most
  // hand-written quotes look.
  const showBreakdown = vatAmount > 0;

  return (
    <Document title={`${title} ${invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.docTitle}>{title}</Text>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Business:</Text>
              <Text>{business.name}</Text>
            </View>
            {business.email && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>Email:</Text>
                <Text>{business.email}</Text>
              </View>
            )}
            {business.phone && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>Phone:</Text>
                <Text>{business.phone}</Text>
              </View>
            )}
            {business.vat_number && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>VAT No:</Text>
                <Text>{business.vat_number}</Text>
              </View>
            )}
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>{type === 'quote' ? 'Quote No:' : 'Invoice No:'}</Text>
              <Text>{invoiceNumber}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text>{formatDateLong(issueDate)}</Text>
            </View>
            {dueDate && (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>Due date:</Text>
                <Text>{formatDateLong(dueDate)}</Text>
              </View>
            )}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop */}
          {business.logo_url && <Image src={business.logo_url} style={styles.logo} />}
        </View>

        <Text style={styles.sectionHeading}>Client</Text>
        <Text style={{ fontWeight: 700 }}>{client?.name ?? 'Walk-in client'}</Text>
        {client?.address && <Text style={styles.muted}>{client.address}</Text>}
        {client?.email && <Text style={styles.muted}>{client.email}</Text>}
        {client?.phone && <Text style={styles.muted}>{client.phone}</Text>}
        {client?.vat_number && <Text style={styles.muted}>VAT: {client.vat_number}</Text>}

        {descriptionLines.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionHeading}>Description:</Text>
            {descriptionLines.map((line, i) => (
              <Text key={i} style={styles.bulletLine}>
                {line.startsWith('-') ? line : `- ${line}`}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.tableHeaderText]}>Item</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.tableHeaderText]}>Price</Text>
            <Text style={[styles.colTotal, styles.tableHeaderText]}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatMoney(item.unit_price, currency)}</Text>
              <Text style={styles.colTotal}>{formatMoney(item.total, currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals} wrap={false}>
          {showBreakdown && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.muted}>Subtotal</Text>
                <Text>{formatMoney(subtotal, currency)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.muted}>VAT ({vatRate}%)</Text>
                <Text>{formatMoney(vatAmount, currency)}</Text>
              </View>
            </>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{type === 'quote' ? 'Total' : 'Amount Due'}</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(total, currency)}</Text>
          </View>
        </View>

        {(notes || terms) && (
          <View style={styles.notesBlock} wrap={false}>
            {notes && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionHeading}>Notes</Text>
                <Text>{notes}</Text>
              </View>
            )}
            {terms && (
              <View>
                <Text style={styles.sectionHeading}>Terms</Text>
                <Text>{terms}</Text>
              </View>
            )}
          </View>
        )}

        {hasBankingDetails(business) && (
          <View wrap={false}>
            <Text style={styles.sectionHeading}>Bank Details:</Text>
            {business.bank_name && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank</Text>
                <Text style={styles.bankValue}>{business.bank_name}</Text>
              </View>
            )}
            {business.account_holder && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account holder</Text>
                <Text style={styles.bankValue}>{business.account_holder}</Text>
              </View>
            )}
            {business.account_number && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account number</Text>
                <Text style={styles.bankValue}>{business.account_number}</Text>
              </View>
            )}
            {business.branch_code && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Branch code</Text>
                <Text style={styles.bankValue}>{business.branch_code}</Text>
              </View>
            )}
            {business.account_type && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account type</Text>
                <Text style={styles.bankValue}>{business.account_type}</Text>
              </View>
            )}
            {business.swift_code && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>SWIFT/BIC</Text>
                <Text style={styles.bankValue}>{business.swift_code}</Text>
              </View>
            )}
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Reference</Text>
              <Text style={styles.bankValue}>Please use {invoiceNumber} as your payment reference</Text>
            </View>
          </View>
        )}

        <Text style={styles.thanks}>Thank you for your support and business.</Text>

        <Text style={styles.footer} fixed>
          Powered by Two Tones Digital
        </Text>
      </Page>
    </Document>
  );
}
