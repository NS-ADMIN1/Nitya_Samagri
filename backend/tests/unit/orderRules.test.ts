import { canChangeStatus, couponDiscount, orderTotals } from "../../src/modules/orders/order.rules";

describe("orderTotals()", () => {
  it("adds GST and the shipping fee below the free-shipping amount", () => {
    expect(orderTotals([{ price: 100, qty: 2, gstPct: 5 }])).toEqual({
      subtotal: 200, gst: 10, shipping: 49, discount: 0, total: 259,
    });
  });

  it("ships free from ₹499", () => {
    expect(orderTotals([{ price: 499, qty: 1, gstPct: 0 }])).toMatchObject({ shipping: 0, gst: 0, total: 499 });
  });

  it("charges no GST on a 0% product", () => {
    expect(orderTotals([{ price: 600, qty: 1, gstPct: 0 }]).gst).toBe(0);
  });

  it("never lets a discount push the total below zero", () => {
    const totals = orderTotals([{ price: 100, qty: 1, gstPct: 0 }], 5000);
    expect(totals.discount).toBe(100);
    expect(totals.total).toBe(49); // only shipping is left to pay
  });
});

describe("couponDiscount()", () => {
  it("applies a percent coupon, capped by maxDiscount", () => {
    expect(couponDiscount({ type: "percent", value: 10 }, 1000)).toBe(100);
    expect(couponDiscount({ type: "percent", value: 10, maxDiscount: 50 }, 1000)).toBe(50);
  });

  it("never takes off more than the items cost", () => {
    expect(couponDiscount({ type: "flat", value: 500 }, 300)).toBe(300);
  });
});

describe("canChangeStatus()", () => {
  it("allows forward steps, including skipping ahead", () => {
    expect(canChangeStatus("pending", "confirmed")).toBe(true);
    expect(canChangeStatus("confirmed", "shipped")).toBe(true);
    expect(canChangeStatus("out_for_delivery", "delivered")).toBe(true);
  });

  it("refuses to move backward", () => {
    expect(canChangeStatus("shipped", "confirmed")).toBe(false);
    expect(canChangeStatus("delivered", "shipped")).toBe(false);
  });

  it("lets a failed delivery be retried", () => {
    expect(canChangeStatus("out_for_delivery", "NDR")).toBe(true);
    expect(canChangeStatus("NDR", "out_for_delivery")).toBe(true);
  });

  it("allows cancelling only before shipping", () => {
    expect(canChangeStatus("processing", "cancelled")).toBe(true);
    expect(canChangeStatus("shipped", "cancelled")).toBe(false);
    expect(canChangeStatus("delivered", "cancelled")).toBe(false);
  });

  it("allows a return only once shipped", () => {
    expect(canChangeStatus("confirmed", "returned")).toBe(false);
    expect(canChangeStatus("shipped", "returned")).toBe(true);
    expect(canChangeStatus("delivered", "returned")).toBe(true);
  });

  it("never brings a cancelled or returned order back into the flow", () => {
    expect(canChangeStatus("cancelled", "shipped")).toBe(false);
    expect(canChangeStatus("returned", "delivered")).toBe(false);
    expect(canChangeStatus("cancelled", "refunded")).toBe(true);
    expect(canChangeStatus("refunded", "confirmed")).toBe(false);
  });
});
