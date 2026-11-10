import type { Config } from "tailwindcss";

// Nitya Samagri brand palette — navy + gold on white.
// The same values live in lib/theme.js (for the few places that need them
// in JS) and as CSS variables in app/globals.css. Change all three together.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#071C42",
          deep:    "#041330", // footer
          soft:    "#12306A", // panels on navy
          hover:   "#0E2F6B",
          line:    "#1B3260", // hairlines on navy
        },
        gold: {
          DEFAULT: "#D6AF43",
          dark:    "#C9A036", // hover
          ink:     "#7A5C0E", // gold-toned text on white (passes 4.5:1)
        },
        offwhite: "#F8F8F5",
        mist:     "#F1F2F4",
        line:     "#E1E3E8",
        field:    "#B9BECA", // input borders
        slate:    { DEFAULT: "#4A5470", light: "#DDE2EE" },
        success:  "#1E5B32",
        danger:   "#A32A1E",
      },
      fontFamily: {
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      maxWidth: {
        site: "1280px",
      },
      boxShadow: {
        card:     "0 1px 2px rgba(7,28,66,0.04)",
        elevated: "0 12px 32px rgba(7,28,66,0.12)",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;