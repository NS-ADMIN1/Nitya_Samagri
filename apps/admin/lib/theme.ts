// apps/admin/lib/theme.ts
//
// Brand values the admin needs in JS. Styling itself uses the Tailwind
// classes generated from tailwind.config.ts — keep the two in step, and in
// step with apps/web/lib/theme.js (the storefront uses the same palette).

export const BRAND = {
  name: "Nitya Samagri",
  panel: "Admin",
  tagline: "Everything for your daily pooja, under one roof",
  logoMark: "/brand/logo-mark.png", // NS monogram
  logoFull: "/brand/logo-full.png", // monogram + name + since 2026
  storefrontUrl: "https://nityasamagri.in",
} as const;

export const COLORS = {
  navy: "#071C42",
  navySoft: "#12306A",
  gold: "#D6AF43",
  goldInk: "#7A5C0E",
  white: "#FFFFFF",
  offwhite: "#F8F8F5",
  mist: "#F1F2F4",
  line: "#E3E5EA",
  slate: "#566074",
} as const;
