// apps/admin/components/dashboard/KpiCard.tsx — one headline number with a line of context.

import Card from "../ui/Card";

interface KpiCardProps {
  label: string;
  value: string;
  note?: string;
}

export default function KpiCard({ label, value, note }: KpiCardProps) {
  return (
    <Card className="p-[18px]">
      <div className="text-[13px] font-medium text-slate">{label}</div>
      <div className="mt-1.5 text-[26px] font-bold leading-tight tracking-[-0.02em] tabular-nums text-navy">{value}</div>
      {note && <div className="mt-1 text-xs text-slate">{note}</div>}
    </Card>
  );
}
