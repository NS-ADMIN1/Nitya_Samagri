// src/modules/invoices/invoice.template.ts
//
// The invoice as a printable HTML page (A4). The apps fetch it and open the
// browser's print dialog — "Save as PDF" there gives the PDF.
import type { Invoice } from "./invoice.service";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const money = (n: number) => `₹${n.toFixed(2)}`;

export function invoiceHtml(inv: Invoice): string {
  const taxHead = inv.sameState ? "<th>CGST</th><th>SGST</th>" : "<th>IGST</th>";

  const rows = inv.lines
    .map(
      (l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(l.name)}<div class="muted">SKU ${esc(l.sku)}</div></td>
        <td>${esc(l.hsn)}</td>
        <td class="num">${l.qty}</td>
        <td class="num">${money(l.price)}</td>
        <td class="num">${money(l.taxable)}</td>
        <td class="num">${l.gstPct}%</td>
        ${inv.sameState ? `<td class="num">${money(l.cgst)}</td><td class="num">${money(l.sgst)}</td>` : `<td class="num">${money(l.igst)}</td>`}
        <td class="num">${money(l.total)}</td>
      </tr>`
    )
    .join("");

  const t = inv.totals;
  const totalRow = (label: string, value: string, strong = false) =>
    `<tr${strong ? ' class="grand"' : ""}><td>${label}</td><td class="num">${value}</td></tr>`;

  const s = inv.seller;
  const b = inv.buyer;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${esc(inv.invoiceNo)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1b2233; font-size: 12px; line-height: 1.45; margin: 0; }
  h1 { font-size: 20px; color: #071C42; margin: 0; letter-spacing: 0.04em; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #D6AF43; padding-bottom: 12px; }
  .cols { display: flex; gap: 24px; margin: 16px 0; }
  .cols > div { flex: 1; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #4A5470; margin-bottom: 4px; }
  .muted { color: #4A5470; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; }
  .items th { background: #071C42; color: #fff; text-align: left; padding: 6px; font-size: 10px; }
  .items td { padding: 6px; border-bottom: 1px solid #E1E3E8; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .totals { width: 280px; margin: 14px 0 0 auto; }
  .totals td { padding: 4px 6px; }
  .grand td { font-weight: bold; font-size: 14px; border-top: 2px solid #071C42; padding-top: 8px; }
  .foot { margin-top: 28px; color: #4A5470; font-size: 10px; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <h1>${esc(s.name)}</h1>
      <div>${esc(s.addressLine)}</div>
      <div>GSTIN: <strong>${esc(s.gstin)}</strong></div>
      <div class="muted">${[s.phone, s.email].filter(Boolean).map(esc).join(" · ")}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Tax invoice</div>
      <div><strong>${esc(inv.invoiceNo)}</strong></div>
      <div>Date: ${esc(inv.invoiceDate)}</div>
      <div>Order: ${esc(inv.orderId)}</div>
    </div>
  </div>

  <div class="cols">
    <div>
      <div class="label">Billed and shipped to</div>
      <div><strong>${esc(b.name)}</strong></div>
      <div>${esc(b.addressLine)}</div>
      ${b.phone ? `<div>Phone: ${esc(b.phone)}</div>` : ""}
    </div>
    <div>
      <div class="label">Supply and payment</div>
      <div>Place of supply: ${esc(b.state)}</div>
      <div>Payment: ${esc(inv.payment.method)} — ${esc(inv.payment.status)}</div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr><th>#</th><th>Item</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Taxable</th><th class="num">GST</th>${taxHead}<th class="num">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    ${totalRow("Taxable value", money(t.taxable))}
    ${inv.sameState ? totalRow("CGST", money(t.cgst)) + totalRow("SGST", money(t.sgst)) : totalRow("IGST", money(t.igst))}
    ${totalRow("Shipping", money(t.shipping))}
    ${t.discount ? totalRow("Discount", `- ${money(t.discount)}`) : ""}
    ${t.roundOff ? totalRow("Round off", money(t.roundOff)) : ""}
    ${totalRow("Total", money(t.grandTotal), true)}
  </table>

  <p class="foot">This is a computer-generated invoice and does not need a signature.</p>
</body>
</html>`;
}
