// apps/admin/components/layout/Topbar.tsx
//
// Page title, one line of context, and the page's main buttons. On phones
// it also holds the button that opens the menu.

import type { ReactNode } from "react";
import Icon from "../ui/Icon";

interface TopbarProps {
  title: string;
  subtitle?: string;
  /** The page's main buttons (e.g. "Add product"). Keep to one or two. */
  actions?: ReactNode;
  onOpenMenu: () => void;
}

export default function Topbar({ title, subtitle, actions, onOpenMenu }: TopbarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-4 pt-5 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-field bg-white text-navy lg:hidden"
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="font-sans text-[22px] font-bold tracking-[-0.02em] text-navy sm:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
