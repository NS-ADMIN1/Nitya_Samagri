// apps/admin/components/ui/Card.tsx — the white panel every section sits in.

import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  /** Set false for cards that hold a full-width table. */
  padded?: boolean;
  className?: string;
}

export default function Card({ children, padded = true, className = "" }: CardProps) {
  return (
    <div className={`min-w-0 rounded-[14px] border border-line bg-white ${padded ? "p-5" : "overflow-hidden"} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  /** Button or link shown on the right. */
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-sans text-base font-semibold tracking-[-0.01em] text-navy">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-slate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
