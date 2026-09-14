export interface CalcLineItem {
  quantity: number;
  unit_price: number;
  vat_rate?: number;
}

export function lineTotal(item: CalcLineItem) {
  return round2((item.quantity || 0) * (item.unit_price || 0));
}

export function calcInvoiceTotals(items: CalcLineItem[], defaultVatRate: number) {
  const subtotal = round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
  // Per-line VAT rate when set, otherwise the invoice-level default rate.
  const vatAmount = round2(
    items.reduce((sum, item) => {
      const rate = item.vat_rate ?? defaultVatRate ?? 0;
      return sum + lineTotal(item) * (rate / 100);
    }, 0)
  );
  const total = round2(subtotal + vatAmount);
  return { subtotal, vatAmount, total };
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
