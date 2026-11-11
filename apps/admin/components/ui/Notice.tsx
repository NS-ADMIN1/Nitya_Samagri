// apps/admin/components/ui/Notice.tsx — a short inline message (error, warning or info).

import type { ReactNode } from "react";
import Icon from "./Icon";

const TONE = {
  info: "border-line bg-white text-slate",
  warning: "border-[#EBD9A4] bg-[#FBF1D3] text-[#6B4F08]",
  error: "border-danger-line bg-danger-soft text-danger",
};

interface NoticeProps {
  tone?: keyof typeof TONE;
  children: ReactNode;
}

export default function Notice({ tone = "info", children }: NoticeProps) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-sm ${TONE[tone]}`}>
      <Icon name={tone === "info" ? "clock" : "alert"} size={17} className="mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Turns an API failure into a sentence staff can act on. */
export function errorMessage(error: unknown, what: string): string {
  const status = (error as { status?: number } | null)?.status;
  if (status === 403) return `Your role does not have access to ${what}. Ask a Super Admin if you need it.`;
  const message = (error as { message?: string } | null)?.message;
  return message && message !== "Something went wrong" ? message : `Could not load ${what}. Check your connection and try again.`;
}
