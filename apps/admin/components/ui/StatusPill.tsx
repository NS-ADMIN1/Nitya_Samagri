// apps/admin/components/ui/StatusPill.tsx
//
// A small coloured label for a status. The wording carries the meaning;
// the colour only reinforces it (tones also differ in lightness, so they
// stay distinguishable for colour-blind staff).

import type { ReactNode } from "react";

export type PillTone = "gold" | "blue" | "violet" | "plum" | "teal" | "green" | "orange" | "red" | "grey" | "navy";

const TONE: Record<PillTone, string> = {
  gold: "bg-[#FBF1D3] text-[#6B4F08]",
  blue: "bg-[#E4ECFA] text-[#1C4A9C]",
  violet: "bg-[#ECE8FA] text-[#48389A]",
  plum: "bg-[#E9E3F5] text-[#5A2F86]",
  teal: "bg-[#DCF0F2] text-[#0B5964]",
  green: "bg-[#E1F2E7] text-[#1A6337]",
  orange: "bg-[#FCE9DA] text-[#8A3C0A]",
  red: "bg-[#FAE2E2] text-[#951B1B]",
  grey: "bg-[#EEF0F3] text-[#48505F]",
  navy: "bg-[#E7EAF1] text-navy",
};

interface StatusPillProps {
  tone: PillTone;
  children: ReactNode;
  /** Hide the leading dot (for labels that are not a status, e.g. a role). */
  dot?: boolean;
}

export default function StatusPill({ tone, children, dot = true }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[tone]}`}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
