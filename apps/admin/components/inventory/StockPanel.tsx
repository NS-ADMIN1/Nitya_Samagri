"use client";

// apps/admin/components/inventory/StockPanel.tsx
//
// Opens beside the Inventory list for one product: a fuller stock change
// (add, remove or set an exact count, with a note) and that product's
// history of changes.

import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatCount, formatDateTime } from "../../lib/format";
import { adjustStock, stockLogsFetcher, stockLogsUrl, stockReasonLabel, type StockOperation } from "../../lib/inventory";
import { STOCK_LEVEL, stockLevel } from "../../lib/orderStatus";
import type { Product } from "../../lib/products";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { Field, Input } from "../ui/Field";
import Icon from "../ui/Icon";
import Notice, { errorMessage } from "../ui/Notice";
import StatusPill from "../ui/StatusPill";
import Tabs from "../ui/Tabs";

interface StockPanelProps {
  product: Product;
  onClose: () => void;
}

const OPERATIONS: { id: StockOperation; label: string }[] = [
  { id: "add", label: "Add" },
  { id: "subtract", label: "Remove" },
  { id: "set", label: "Set exact count" },
];

export default function StockPanel({ product, onClose }: StockPanelProps) {
  const [operation, setOperation] = useState<StockOperation>("add");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: logs, error: logsError } = useSWR(stockLogsUrl(product._id), stockLogsFetcher, { shouldRetryOnError: false });

  // Start clean whenever a different product is opened.
  useEffect(() => {
    setOperation("add");
    setQuantity("");
    setNote("");
    setError("");
  }, [product._id]);

  const qty = Number(quantity);
  const level = stockLevel(product.stock, product.lowStockAt);
  const after = operation === "add" ? product.stock + qty : operation === "subtract" ? product.stock - qty : qty;

  let problem = "";
  if (quantity === "" || !Number.isInteger(qty) || qty < 0) problem = "Enter a whole number";
  else if (operation !== "set" && qty === 0) problem = "Enter a quantity above 0";
  else if (operation === "subtract" && qty > product.stock) problem = `Only ${formatCount(product.stock)} in stock`;

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adjustStock(product._id, operation, qty, note);
      setQuantity("");
      setNote("");
    } catch (err) {
      setError(errorMessage(err, "changing stock"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-bold tracking-[-0.01em] text-navy">{product.name}</div>
          <div className="text-xs text-slate">{product.sku}</div>
        </div>
        <button type="button" aria-label="Close stock details" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-slate hover:bg-mist">
          <Icon name="close" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-offwhite px-3.5 py-3">
        <div>
          <div className="text-xs text-slate">In stock now</div>
          <div className="text-[26px] font-bold leading-tight tabular-nums text-navy">{formatCount(product.stock)}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill tone={STOCK_LEVEL[level].tone}>{STOCK_LEVEL[level].label}</StatusPill>
          <span className="text-xs text-slate">Alert at {formatCount(product.lowStockAt)}</span>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3.5">
        <Tabs label="Type of stock change" items={OPERATIONS} value={operation} onChange={setOperation} />
        <Field id="stock-qty" label={operation === "set" ? "Counted quantity" : "Quantity"} helper={!problem ? `Stock after this change: ${formatCount(after)}` : undefined}>
          <Input id="stock-qty" type="number" inputMode="numeric" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50" />
        </Field>
        <Field id="stock-note" label="Note (optional)" helper="Saved in the history with your name">
          <Input id="stock-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New shipment, damaged pieces" />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" icon="check" loading={saving} fullWidth>
          Save stock change
        </Button>
      </form>

      <hr className="my-4 border-0 border-t border-line" />

      <h3 className="mb-1 font-sans text-[13px] font-semibold text-navy">Stock history</h3>
      {logsError ? (
        <Notice tone="error">{errorMessage(logsError, "stock history")}</Notice>
      ) : !logs ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate">No stock changes recorded yet.</p>
      ) : (
        <ul className="flex max-h-[360px] flex-col overflow-y-auto">
          {logs.map((log) => {
            const up = log.change >= 0;
            return (
              <li key={log._id} className="flex items-start gap-3 border-b border-[#EEF0F3] py-3 last:border-b-0">
                <span
                  className={`min-w-[48px] rounded-lg px-2 py-0.5 text-center text-[13px] font-bold tabular-nums ${
                    up ? "bg-[#E1F2E7] text-[#1A6337]" : "bg-[#EEF0F3] text-[#48505F]"
                  }`}
                >
                  {up ? "+" : "−"}
                  {formatCount(Math.abs(log.change))}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-navy">{log.note || stockReasonLabel(log.reason)}</div>
                  <div className="text-xs text-slate">
                    {[log.note ? stockReasonLabel(log.reason) : "", log.performedBy?.name, formatDateTime(log.createdAt)].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
