"use client";

// components/layout/MobileBottomNav.jsx — thumb-reach navigation on phones.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import { useCartStore } from "../../lib/cartStore";
import { hidesBottomNav, usesLegacyChrome } from "../../lib/theme";
import Icon from "../ui/Icon";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  if (usesLegacyChrome(pathname) || hidesBottomNav(pathname)) return null;

  const cartCount = mounted ? items.reduce((sum, i) => sum + i.qty, 0) : 0;

  const tabs = [
    { label: "Home", href: "/", icon: "home" },
    { label: "Shop", href: "/shop", icon: "grid" },
    { label: "Festivals", href: "/festival", icon: "calendar" },
    { label: "Account", href: loggedIn ? "/account" : "/login", icon: "user" },
    { label: "Cart", href: "/cart", icon: "cart", badge: cartCount },
  ];

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <>
      {/* Spacer so the fixed bar never covers the end of the page */}
      <div aria-hidden="true" className="h-[60px] md:hidden" />
      <nav
        aria-label="Quick links"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                active ? "font-bold text-navy" : "font-medium text-slate"
              }`}
            >
              <span className="relative">
                <Icon name={tab.icon} size={22} />
                {tab.badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-2.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy"
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}