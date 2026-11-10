"use client";

// apps/web/app/cart/page.jsx — cart and checkout.
//
// Three steps on one page: Cart → Delivery address → Payment.
//
// Placing an order (unchanged backend contract):
//   1. POST /orders                    creates the order, reserves stock, validates any coupon
//   2. cash on delivery                → done
//      online payment                  → POST /payments/create-order → Razorpay window
//                                        → POST /payments/verify
//
// The amounts shown before step 1 come from lib/pricing.js, which mirrors
// the backend's pricing. Once the order exists, the backend's own total is
// what is shown and charged.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, isLoggedIn } from "../../lib/auth";
import { useCartStore } from "../../lib/cartStore";
import { formatPrice } from "../../lib/format";
import { calcCartTotals, cartItemKey } from "../../lib/pricing";
import { BRAND, COLORS } from "../../lib/theme";
import AddressStep, { formatAddress } from "../../components/checkout/AddressStep";
import CartLineItem from "../../components/checkout/CartLineItem";
import CheckoutSteps from "../../components/checkout/CheckoutSteps";
import OrderSummary from "../../components/checkout/OrderSummary";
import PaymentMethods from "../../components/checkout/PaymentMethods";
import Icon from "../../components/ui/Icon";

const STEPS = ["Cart", "Delivery address", "Payment"];
const STEP_CART = 0;
const STEP_ADDRESS = 1;
const STEP_PAYMENT = 2;

function Panel({ title, action, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-line p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="heading-display text-[22px] md:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Opens the Razorpay window (script loaded in app/layout.tsx) and resolves
// with Razorpay's response once the customer has paid.
function openRazorpay(pay, customer) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.Razorpay) {
      reject(new Error("The payment window could not be loaded. Please refresh the page and try again."));
      return;
    }
    const rzp = new window.Razorpay({
      key: pay.keyId,
      amount: pay.amount,
      currency: pay.currency,
      order_id: pay.razorpayOrderId,
      name: BRAND.name,
      prefill: { name: customer?.name, contact: customer?.phone },
      theme: { color: COLORS.navy },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error("PAYMENT_DISMISSED")) },
    });
    rzp.open();
  });
}

function OrderPlaced({ order }) {
  const paidOnline = order.paymentMethod !== "cod";
  return (
    <div className="site-container flex justify-center py-12 md:py-20">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-5 rounded-md border border-line border-t-[3px] border-t-gold p-6 text-center md:p-10">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-navy text-gold">
          <Icon name="check" size={28} />
        </span>
        <h1 className="heading-display text-[28px] md:text-[34px]">Order placed</h1>
        <p className="text-slate">Thank you. Your order has been received.</p>
        <dl className="flex w-full flex-col gap-2 rounded bg-offwhite p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate">Order ID</dt>
            <dd className="font-semibold">{order.orderId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate">{paidOnline ? "Amount paid" : "Amount to pay on delivery"}</dt>
            <dd className="font-semibold">{formatPrice(order.total)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Coupon discount</dt>
              <dd className="font-semibold">− {formatPrice(order.discount)}</dd>
            </div>
          )}
        </dl>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link href={`/delivery?orderId=${encodeURIComponent(order.orderId)}`} className="btn btn-gold flex-1">
            Track order
          </Link>
          <Link href="/shop" className="btn btn-outline flex-1">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  // The cart lives in localStorage, so wait for mount before rendering it.
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    setMounted(true);
    setLoggedIn(isLoggedIn());
  }, []);

  const [step, setStep] = useState(STEP_CART);
  const [address, setAddress] = useState(null);
  const [method, setMethod] = useState("razorpay");
  const [couponCode, setCouponCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  // An order that was created but not yet paid (the customer closed the
  // Razorpay window, or verification failed). Retrying reuses it instead of
  // creating a second order — as long as nothing about the order changed.
  const [pendingOrder, setPendingOrder] = useState(null);

  const totals = calcCartTotals(items);
  const orderSignature = JSON.stringify({
    items: items.map((i) => [cartItemKey(i), i.qty]),
    address: address?.id,
    couponCode,
  });

  // If the cart is emptied part-way through checkout, go back to the cart.
  useEffect(() => {
    if (mounted && !placedOrder && items.length === 0 && step !== STEP_CART) setStep(STEP_CART);
  }, [mounted, placedOrder, items.length, step]);

  const goTo = (next) => {
    setError("");
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startCheckout = () => {
    if (!isLoggedIn()) {
      // The cart is saved in this browser, so it is still here after login.
      router.push("/login?next=/cart");
      return;
    }
    goTo(STEP_ADDRESS);
  };

  const placeOrder = async () => {
    if (!isLoggedIn()) {
      router.push("/login?next=/cart");
      return;
    }
    if (!address) {
      setError("Please choose a delivery address.");
      return;
    }

    setPlacing(true);
    setError("");

    try {
      // 1. Create the order — or reuse the unpaid one from a previous try.
      let order = pendingOrder?.signature === orderSignature ? pendingOrder.order : null;

      if (!order) {
        const res = await apiFetch("/orders", {
          method: "POST",
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              ...(i.variantId ? { variantId: i.variantId } : {}),
              qty: i.qty,
            })),
            addressId: address.id,
            paymentMethod: method,
            ...(couponCode ? { couponCode } : {}),
          }),
        });
        if (!res.ok) throw new Error(res.body?.message || "We couldn't place your order. Please try again.");
        order = res.body.data.order;
      }

      // 2a. Cash on delivery: nothing more to do.
      if (method === "cod") {
        clearCart();
        setPendingOrder(null);
        setPlacedOrder({ ...order, paymentMethod: "cod" });
        return;
      }

      // 2b. Online: keep the unpaid order so a retry does not duplicate it.
      setPendingOrder({ order, signature: orderSignature });

      const payRes = await apiFetch("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ orderId: order.orderId }),
      });
      if (!payRes.ok) throw new Error(payRes.body?.message || "We couldn't start the payment. Please try again.");

      let response;
      try {
        response = await openRazorpay(payRes.body.data, address);
      } catch (err) {
        if (err instanceof Error && err.message === "PAYMENT_DISMISSED") {
          throw new Error(`Payment was not completed. Your order ${order.orderId} is saved — choose "Pay now" to try again.`);
        }
        throw err;
      }

      const verifyRes = await apiFetch("/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
          orderId: order.orderId,
        }),
      });
      if (!verifyRes.ok) {
        throw new Error(
          verifyRes.body?.message ||
            `We couldn't confirm your payment for order ${order.orderId}. If money was deducted, please contact ${BRAND.email}.`
        );
      }

      clearCart();
      setPendingOrder(null);
      setPlacedOrder({ ...order, paymentMethod: method });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (placedOrder) return <OrderPlaced order={placedOrder} />;

  if (!mounted) {
    return <div className="site-container py-16 text-center text-sm text-slate">Loading your cart…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="site-container flex flex-col items-center gap-5 py-16 text-center md:py-24">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-mist text-slate">
          <Icon name="cart" size={30} />
        </span>
        <h1 className="heading-display text-[28px] md:text-[34px]">Your cart is empty</h1>
        <p className="max-w-[420px] text-slate">Add the pooja essentials you need and they will appear here.</p>
        <Link href="/shop" className="btn btn-gold">
          Shop all products
        </Link>
      </div>
    );
  }

  // The unpaid order's total is exact (it includes any coupon); before an
  // order exists the figure is the cart estimate.
  const reusingOrder = pendingOrder?.signature === orderSignature;
  const payable = reusingOrder ? pendingOrder.order.total : totals.total;

  return (
    <>
      <div className="border-b border-line bg-offwhite">
        <div className="site-container flex flex-col gap-4 py-6 md:py-7">
          <h1 className="heading-display text-[28px] md:text-[38px]">{step === STEP_CART ? "Your Cart" : "Checkout"}</h1>
          <CheckoutSteps steps={STEPS} current={step} />
        </div>
      </div>

      <div className="site-container flex flex-col gap-6 pb-14 pt-6 md:flex-row md:items-start md:gap-9 md:pb-[72px] md:pt-9">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {step !== STEP_CART && (
            <button
              type="button"
              disabled={placing}
              onClick={() => goTo(step - 1)}
              className="inline-flex min-h-[40px] items-center gap-1 self-start text-sm font-semibold hover:text-navy-hover"
            >
              <Icon name="chevronLeft" size={16} />
              Back to {STEPS[step - 1].toLowerCase()}
            </button>
          )}

          {error && (
            <p role="alert" className="rounded border border-danger bg-white p-4 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          {step === STEP_CART && (
            <Panel title={`Items in your cart (${totals.count})`}>
              <ul className="flex flex-col">
                {items.map((item) => (
                  <CartLineItem key={cartItemKey(item)} item={item} />
                ))}
              </ul>
            </Panel>
          )}

          {step === STEP_ADDRESS && (
            <Panel title="Delivery address">
              <AddressStep selected={address} onSelect={setAddress} />
            </Panel>
          )}

          {step === STEP_PAYMENT && (
            <>
              <Panel title="Payment method">
                <PaymentMethods value={method} onChange={setMethod} disabled={placing || reusingOrder} />
                {reusingOrder && (
                  <p className="text-[13px] text-slate">
                    Order {pendingOrder.order.orderId} is waiting for payment. Change the cart, address or coupon to
                    start a new order instead.
                  </p>
                )}
              </Panel>

              <Panel
                title="Delivering to"
                action={
                  <button
                    type="button"
                    disabled={placing}
                    onClick={() => goTo(STEP_ADDRESS)}
                    className="min-h-[36px] text-sm font-semibold underline"
                  >
                    Change
                  </button>
                }
              >
                {address && (
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">{address.name}</span>
                    <br />
                    <span className="text-slate">{formatAddress(address)}</span>
                    <br />
                    <span className="text-slate">{address.phone}</span>
                  </p>
                )}
              </Panel>

              <Panel title={`Items (${totals.count})`}>
                <ul className="flex flex-col">
                  {items.map((item) => (
                    <CartLineItem key={cartItemKey(item)} item={item} editable={false} />
                  ))}
                </ul>
              </Panel>
            </>
          )}
        </div>

        <OrderSummary totals={totals} couponCode={couponCode} onCouponChange={setCouponCode} busy={placing}>
          {step === STEP_CART && (
            <>
              <button type="button" onClick={startCheckout} className="btn btn-gold min-h-[54px] w-full">
                {loggedIn ? "Proceed to checkout" : "Log in to checkout"}
              </button>
              {!loggedIn && <p className="text-[13px] text-slate">Your cart is saved on this device while you log in.</p>}
            </>
          )}

          {step === STEP_ADDRESS && (
            <button
              type="button"
              disabled={!address}
              onClick={() => goTo(STEP_PAYMENT)}
              className="btn btn-gold min-h-[54px] w-full"
            >
              Continue to payment
            </button>
          )}

          {step === STEP_PAYMENT && (
            <button type="button" disabled={placing || !address} onClick={placeOrder} className="btn btn-gold min-h-[54px] w-full">
              {placing
                ? "Please wait…"
                : method === "cod"
                  ? "Place order"
                  : reusingOrder || !couponCode
                    ? `Pay now · ${formatPrice(payable)}`
                    : "Pay now"}
            </button>
          )}
        </OrderSummary>
      </div>
    </>
  );
}