// apps/admin/components/dashboard/TaskCard.tsx
//
// One "needs your attention" card on the Dashboard: a count, what it is,
// and a button that opens the exact list to work through.

import Button from "../ui/Button";
import Card from "../ui/Card";
import Icon, { type IconName } from "../ui/Icon";

const TONE = {
  gold: "bg-[#FBF1D3] text-[#6B4F08]",
  blue: "bg-[#E4ECFA] text-[#1C4A9C]",
  orange: "bg-[#FCE9DA] text-[#8A3C0A]",
  red: "bg-[#FAE2E2] text-[#951B1B]",
};

interface TaskCardProps {
  icon: IconName;
  tone: keyof typeof TONE;
  /** `undefined` while loading. */
  count: number | undefined;
  label: string;
  hint: string;
  cta: string;
  href: string;
}

export default function TaskCard({ icon, tone, count, label, hint, cta, href }: TaskCardProps) {
  return (
    <Card className="flex flex-col p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${TONE[tone]}`}>
          <Icon name={icon} size={20} />
        </span>
        <span className="text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums text-navy">
          {count === undefined ? "–" : count.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="my-3.5">
        <div className="text-[15px] font-semibold text-navy">{label}</div>
        <div className="mt-0.5 text-[13px] text-slate">{hint}</div>
      </div>
      <div className="mt-auto">
        <Button variant={count ? "primary" : "ghost"} href={href} fullWidth>
          {cta}
        </Button>
      </div>
    </Card>
  );
}
