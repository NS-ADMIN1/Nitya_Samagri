// components/home/SectionHeader.jsx — heading row shared by homepage sections.

import Link from "next/link";
import Icon from "../ui/Icon";

export default function SectionHeader({ id, title, subtitle, href, linkLabel = "View all", light = false }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="flex flex-col gap-1.5">
        <h2 id={id} className={`heading-display text-[26px] md:text-[34px] ${light ? "text-white" : ""}`}>
          {title}
        </h2>
        {subtitle && <p className={light ? "text-slate-light" : "text-slate"}>{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className={`inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold ${
            light ? "text-gold" : "text-navy hover:text-navy-hover"
          }`}
        >
          {linkLabel}
          <Icon name="chevronRight" size={16} />
        </Link>
      )}
    </div>
  );
}
