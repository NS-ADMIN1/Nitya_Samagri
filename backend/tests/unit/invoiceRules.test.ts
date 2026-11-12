import { financialYear, formatInvoiceNo, invoiceLine, invoiceTotals, isSameState } from "../../src/modules/invoices/invoice.rules";

describe("financialYear()", () => {
  it("runs April to March", () => {
    expect(financialYear(new Date(2026, 10, 11))).toBe("2026-27"); // 11 Nov 2026
    expect(financialYear(new Date(2027, 1, 5))).toBe("2026-27");   // 5 Feb 2027
    expect(financialYear(new Date(2027, 3, 1))).toBe("2027-28");   // 1 Apr 2027
  });
});

describe("formatInvoiceNo()", () => {
  it("pads the running number to six digits", () => {
    expect(formatInvoiceNo("NS", "2026-27", 123)).toBe("NS/2026-27/000123");
  });
});

describe("isSameState()", () => {
  it("ignores case and spacing", () => {
    expect(isSameState("Uttar Pradesh", "uttar  pradesh")).toBe(true);
    expect(isSameState("Uttar Pradesh", "Delhi")).toBe(false);
    expect(isSameState("", "")).toBe(false);
  });
});

describe("invoiceLine() and invoiceTotals()", () => {
  const item = { name: "Ghee", sku: "GH-1", hsn: "0405", qty: 2, price: 100, gstPct: 5 };

  it("splits GST into CGST + SGST inside the state", () => {
    expect(invoiceLine(item, true)).toMatchObject({ taxable: 200, cgst: 5, sgst: 5, igst: 0, tax: 10, total: 210 });
  });

  it("charges IGST to another state", () => {
    expect(invoiceLine(item, false)).toMatchObject({ cgst: 0, sgst: 0, igst: 10, tax: 10 });
  });

  it("keeps CGST + SGST equal to the tax when it is an odd paisa amount", () => {
    const line = invoiceLine({ ...item, qty: 1, price: 33.3, gstPct: 5 }, true); // tax is an odd number of paise
    expect(Math.round((line.cgst + line.sgst) * 100)).toBe(Math.round(line.tax * 100));
  });

  it("ends on the amount the customer was charged, with the difference as round-off", () => {
    const lines = [invoiceLine({ ...item, qty: 1, price: 99.5, gstPct: 5 }, true)]; // lines add up to a few paise off a whole rupee
    const totals = invoiceTotals(lines, { shipping: 49, discount: 0, total: 153 });
    expect(totals.grandTotal).toBe(153);
    expect(Math.round((totals.taxable + totals.tax + totals.shipping - totals.discount + totals.roundOff) * 100)).toBe(15300);
  });
});
