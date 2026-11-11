"use client";

// apps/admin/components/ui/DataTable.tsx
//
// The one table for every list (orders, products, stock, coupons, team).
// Describe the columns once, pass the rows. Scrolls sideways inside its own
// box on small screens instead of breaking the page.

import type { ReactNode } from "react";

export interface Column<Row> {
  id: string;
  header: string;
  align?: "left" | "right" | "center";
  /** What to show in the cell for one row. */
  cell: (row: Row) => ReactNode;
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Short description of the table for screen readers, e.g. "Orders". */
  caption: string;
  loading?: boolean;
  /** Shown when there are no rows, e.g. "No orders match this filter". */
  emptyText?: string;
  /** Highlights one row (the one open in a side panel). */
  selectedKey?: string | null;
  onRowClick?: (row: Row) => void;
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

export default function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  emptyText = "Nothing to show yet",
  selectedKey = null,
  onRowClick,
}: DataTableProps<Row>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={`whitespace-nowrap border-b border-line bg-[#FBFBF9] px-3.5 py-2.5 text-xs font-semibold text-slate ${ALIGN[col.align || "left"]}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading || rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3.5 py-10 text-center text-sm text-slate">
                {loading ? "Loading…" : emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${key === selectedKey ? "bg-[#F4F6FB]" : ""} ${onRowClick ? "cursor-pointer hover:bg-[#F7F8FB]" : ""}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`border-b border-[#EEF0F3] px-3.5 py-3 align-middle text-sm text-navy ${ALIGN[col.align || "left"]}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
