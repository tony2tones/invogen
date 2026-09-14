import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { BusinessProfile, Client, InvoiceItem, InvoiceType } from '@/types/database';

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { width: 80, height: 80, objectFit: 'contain', marginBottom: 6 },
  businessName: { fontSize: 14, fontWeight: 700 },
  muted: { color: '#6b7280' },
  docTitle: { fontSize: 20, fontWeight: 700, textAlign: 'right' },
  docMeta: { textAlign: 'right', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 8, textTransform: 'uppercase', color: '#6b7280', marginBottom: 4, letterSpacing: 0.5 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  table: { borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827', paddingVertical: 6 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 6 },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.4, textAlign: 'right' },
  colTotal: { flex: 1.4, textAlign: 'right' },
  tableHeaderText: { fontSize: 8, textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 },
  totals: { marginTop: 14, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: '#111827' },
  grandTotalLabel: { fontWeight: 700, fontSize: 12 },
  grandTotalValue: { fontWeight: 700, fontSize: 12 },
  notesBlock: { marginTop: 24 },
  bankingBlock: { marginTop: 16, padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 },
  bankingRow: { flexDirection: 'row', width: '50%', justifyContent: 'space-between', marginBottom: 2 },
  bankingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  bankingReference: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
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
  items: Pick<InvoiceItem, 'description' | 'quantity' | 'unit_price' | 'total'>[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
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
  notes,
  terms,
}: InvoiceDocumentProps) {
  const title = type === 'quote' ? 'Quotation' : 'Tax Invoice';
  const currency = business.currency || 'ZAR';

  return (
    <Document title={`${title} ${invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop */}
            {business.logo_url && <Image src={business.logo_url} style={styles.logo} />}
            <Text style={styles.businessName}>{business.name}</Text>
            {business.address && <Text style={styles.muted}>{business.address}</Text>}
            {business.phone && <Text style={styles.muted}>{business.phone}</Text>}
            {business.email && <Text style={styles.muted}>{business.email}</Text>}
            {business.vat_number && <Text style={styles.muted}>VAT: {business.vat_number}</Text>}
          </View>
          <View>
            <Text style={styles.docTitle}>{title}</Text>
            <View style={styles.docMeta}>
              <Text>{invoiceNumber}</Text>
              <Text style={styles.muted}>Issued: {issueDate}</Text>
              {dueDate && <Text style={styles.muted}>Due: {dueDate}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={{ maxWidth: 260 }}>
            <Text style={styles.sectionLabel}>{type === 'quote' ? 'Quoted to' : 'Billed to'}</Text>
            <Text style={{ fontWeight: 700 }}>{client?.name ?? 'Walk-in client'}</Text>
            {client?.address && <Text style={styles.muted}>{client.address}</Text>}
            {client?.email && <Text style={styles.muted}>{client.email}</Text>}
            {client?.phone && <Text style={styles.muted}>{client.phone}</Text>}
            {client?.vat_number && <Text style={styles.muted}>VAT: {client.vat_number}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.tableHeaderText]}>Price</Text>
            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
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

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatMoney(subtotal, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>VAT ({vatRate}%)</Text>
            <Text>{formatMoney(vatAmount, currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(total, currency)}</Text>
          </View>
        </View>

        {(notes || terms) && (
          <View style={styles.notesBlock}>
            {notes && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text>{notes}</Text>
              </View>
            )}
            {terms && (
              <View>
                <Text style={styles.sectionLabel}>Terms</Text>
                <Text>{terms}</Text>
              </View>
            )}
          </View>
        )}

        {(business.bank_name || business.account_number) && (
          <View style={styles.bankingBlock} wrap={false}>
            <Text style={styles.sectionLabel}>Banking details</Text>
            <View style={styles.bankingGrid}>
              {business.bank_name && (
                <View style={styles.bankingRow}>
                  <Text style={styles.muted}>Bank</Text>
                  <Text>{business.bank_name}</Text>
                </View>
              )}
              {business.account_holder && (
                <View style={styles.bankingRow}>
                  <Text style={styles.muted}>Account holder</Text>
                  <Text>{business.account_holder}</Text>
                </View>
              )}
              {business.account_number && (
                <View style={styles.bankingRow}>
                  <Text style={styles.muted}>Acc no.</Text>
                  <Text>{business.account_number}</Text>
                </View>
              )}
              {business.branch_code && (
                <View style={styles.bankingRow}>
                  <Text style={styles.muted}>Branch code</Text>
                  <Text>{business.branch_code}</Text>
                </View>
              )}
              {business.account_type && (
                <View style={styles.bankingRow}>
                  <Text style={styles.muted}>Account type</Text>
                  <Text>{business.account_type}</Text>
                </View>
              )}
            </View>
            <Text style={styles.bankingReference}>Please use {invoiceNumber} as your payment reference.</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Powered by Two Tones Digital
        </Text>
      </Page>
    </Document>
  );
}
