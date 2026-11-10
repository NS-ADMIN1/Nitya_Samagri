// components/ui/StatusBadge.jsx — an order's status as a small label.
// The wording carries the meaning; colour only reinforces it.

import { orderStatusGroup, orderStatusLabel } from "../../lib/orders";

const TONE = {
  active: "border-gold bg-white text-navy",
  delivered: "border-success bg-white text-success",
  closed: "border-field bg-mist text-slate",
};

/**
 * @param {{ status: string }} props
 */
export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE[orderStatusGroup(status)]}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
