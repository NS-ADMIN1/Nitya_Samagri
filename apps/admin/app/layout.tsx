// apps/admin/app/layout.tsx
// Admin panel — Nitya Samagri

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
});

export const metadata: Metadata = {
  title:       "Nitya Samagri Admin",
  description: "Manage orders, products, stock, offers and the team for Nitya Samagri",
  robots:      { index: false, follow: false }, // never index the admin panel
  icons: {
    icon:     "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple:    "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor:   "#071C42",
  width:        "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}