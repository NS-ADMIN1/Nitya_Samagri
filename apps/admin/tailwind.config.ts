import type { Config } from "tailwindcss";

// Nitya Samagri brand palette — navy + gold on off-white, the same values
// as apps/web. lib/theme.ts holds the few values needed in JS, and
// app/globals.css the CSS variables. Change all three together.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:     { DEFAULT: "#071C42", soft: "#12306A", hover: "#0E2F6B" },
        gold:     { DEFAULT: "#D6AF43", dark: "#C9A036", ink: "#7A5C0E" },
        offwhite: "#F8F8F5",
        mist:     "#F1F2F4",
        line:     "#E3E5EA",
        field:    "#B9BECA", // input borders
        slate:    "#566074", // secondary text
        success:  "#1A6337",
        danger:   { DEFAULT: "#951B1B", soft: "#FDF3F3", line: "#E7BDBD" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;