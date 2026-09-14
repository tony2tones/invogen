interface DescriptionItemLike {
  product_id: string | null;
}

/**
 * Combines the freeform invoice description with each catalog product's own
 * description (deduped by product, in item order) — so a product's
 * description always shows up once it's on the invoice, regardless of
 * whether/when the user typed anything in the description field themselves.
 */
export function buildDescriptionLines(
  manualDescription: string,
  items: DescriptionItemLike[],
  productDescriptions: Record<string, string>
): string[] {
  const manualLines = manualDescription
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const productLines: string[] = [];
  for (const item of items) {
    if (!item.product_id || seen.has(item.product_id)) continue;
    const desc = productDescriptions[item.product_id];
    if (!desc) continue;
    seen.add(item.product_id);
    productLines.push(desc.trim());
  }

  return [...manualLines, ...productLines];
}
