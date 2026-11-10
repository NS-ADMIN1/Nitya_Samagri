// apps/web/lib/theme.js
//
// Single source for brand values that JS needs (most styling uses the
// Tailwind classes generated from tailwind.config.ts — keep the two and the
// CSS variables in app/globals.css in step).

export const BRAND = {
  name: "Nitya Samagri",
  wordmark: "NITYA SAMAGRI",
  since: "SINCE 2026",
  tagline: "Everything for your daily pooja, under one roof",
  logoMark: "/brand/logo-mark.png", // NS monogram
  logoFull: "/brand/logo-full.png", // monogram + name + since 2026
  email: "support@nityasamagri.in",
  phone: "+91 8595427053",
  phoneHref: "tel:+918595427053",
  location: "Noida, Uttar Pradesh",
};

export const COLORS = {
  navy: "#071C42",
  navyDeep: "#041330",
  navySoft: "#12306A",
  gold: "#D6AF43",
  goldDark: "#C9A036",
  goldInk: "#7A5C0E",
  white: "#FFFFFF",
  offwhite: "#F8F8F5",
  mist: "#F1F2F4",
  line: "#E1E3E8",
  slate: "#4A5470",
};

// Routes that should NOT get the shared header, footer and mobile bottom
// bar. Empty now that every page uses them; add a path prefix here (for
// example "/checkout-embed") if a future page needs to render without them.
/** @type {string[]} */
export const LEGACY_CHROME_PREFIXES = [];

export function usesLegacyChrome(pathname) {
  if (!pathname) return false;
  return LEGACY_CHROME_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Pages with their own fixed bar at the bottom of the screen on phones
// (the product page's buy bar) — the mobile bottom nav hides on these.
export const HIDE_BOTTOM_NAV_PREFIXES = ["/product"];

export function hidesBottomNav(pathname) {
  if (!pathname) return false;
  return HIDE_BOTTOM_NAV_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}