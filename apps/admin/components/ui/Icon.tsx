// apps/admin/components/ui/Icon.tsx
//
// Line icons drawn inline, so the admin needs no icon package and never
// falls back to emoji. Icons are decorative by default (aria-hidden); pass
// `label` when an icon stands alone without text.

import type { ReactNode } from "react";

const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  orders: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  products: (
    <>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  inventory: (
    <>
      <path d="M12 2l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <path d="M16 4.3a4 4 0 010 7.4M22 21c0-3-1.8-5.6-4.5-6.6" />
    </>
  ),
  coupons: (
    <>
      <path d="M3 9V6a1 1 0 011-1h16a1 1 0 011 1v3a3 3 0 000 6v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a3 3 0 000-6z" />
      <path d="M14 6v12" strokeDasharray="2 3" />
    </>
  ),
  store: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
      <path d="M5 12v8h14v-8" />
    </>
  ),
  reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  team: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12l5 5 9-10" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  print: (
    <>
      <path d="M7 8V3h10v5" />
      <rect x="3" y="8" width="18" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5M12 18v.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  return: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 010 12h-3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-8 9" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  phone: <path d="M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z" />,
  logout: <path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9" />,
  drag: (
    <>
      <circle cx="9" cy="6" r="1.2" />
      <circle cx="15" cy="6" r="1.2" />
      <circle cx="9" cy="12" r="1.2" />
      <circle cx="15" cy="12" r="1.2" />
      <circle cx="9" cy="18" r="1.2" />
      <circle cx="15" cy="18" r="1.2" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  /** Width and height in px. */
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Accessible name. Leave out when the icon sits next to text that says the same. */
  label?: string;
}

export default function Icon({ name, size = 18, strokeWidth = 1.7, className = "", label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {PATHS[name]}
    </svg>
  );
}
