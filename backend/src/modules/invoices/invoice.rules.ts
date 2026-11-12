// src/modules/invoices/invoice.rules.ts
//
// The arithmetic of a GST invoice — plain functions, no database.

const round2 = (n: number) => Math.round(n * 100) / 100;

/** India's financial year runs April to March: 10 Nov 2026 → "2026-27", 5 Feb 2027 → "2026-27". */
export function financialYear(date: Date): string {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** e.g. NS/2026-27/000123 */
export function formatInvoiceNo(prefix: string, year: string, seq: number): string {
  return `${prefix}/${year}/${String(seq).padStart(6, "0")}`;
}

/** Same state → CGST + SGST; different state → IGST. Compared without case or spaces. */
export function isSameState(a?: string, b?: string): boolean {
  const clean = (s?: string) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
  return clean(a) !== "" && clean(a) === clean(b);
}

export interface InvoiceItem {
  name:    string;
  sku:     string;
  hsn:     string;
  qty:     number;
  price:   number; // unit price before GST
  gstPct:  number;
}

/** One invoice row: taxable value, the GST on it, and how that GST is split. */
export function invoiceLine(item: InvoiceItem, sameState: boolean) {
  const taxable = round2(item.price * item.qty);
  const tax     = round2((taxable * item.gstPct) / 100);
  const half    = round2(tax / 2);

  return {
    ...item,
    taxable,
    cgst:  sameState ? half : 0,
    sgst:  sameState ? round2(tax - half) : 0,
    igst:  sameState ? 0 : tax,
    tax,
    total: round2(taxable + tax),
  };
}

/**
 * Invoice totals. `grandTotal` is what the customer was actually charged
 * (the order total, in whole rupees); `roundOff` is the small difference
 * between that and the exact sum of the lines.
 */
export function invoiceTotals(
  lines: Array<ReturnType<typeof invoiceLine>>,
  order: { shipping: number; discount: number; total: number }
) {
  const sum = (pick: (l: ReturnType<typeof invoiceLine>) => number) => round2(lines.reduce((s, l) => s + pick(l), 0));

  const taxable = sum((l) => l.taxable);
  const tax     = sum((l) => l.tax);
  const exact   = round2(taxable + tax + order.shipping - order.discount);

  return {
    taxable,
    cgst: sum((l) => l.cgst),
    sgst: sum((l) => l.sgst),
    igst: sum((l) => l.igst),
    tax,
    shipping:   order.shipping,
    discount:   order.discount,
    roundOff:   round2(order.total - exact),
    grandTotal: order.total,
  };
}
