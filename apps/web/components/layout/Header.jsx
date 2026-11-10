"use client";

// components/layout/Header.jsx
//
// The one storefront header: logo, search, account, cart, category nav and
// the mobile menu. Rendered once from app/layout.tsx.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import { getCategories } from "../../lib/catalog";
import { useCartStore } from "../../lib/cartStore";
import { BRAND, usesLegacyChrome } from "../../lib/theme";
import Icon from "../ui/Icon";
import AnnouncementBar from "./AnnouncementBar";

const NAV_CATEGORY_LIMIT = 4;

function SearchForm({ className = "", onDone }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    onDone?.();
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className={`flex min-h-[48px] items-center gap-2 rounded border border-field bg-white pl-3.5 pr-1.5 text-slate focus-within:border-navy ${className}`}
    >
      <Icon name="search" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search products"
        placeholder="Search kapoor, agarbatti, diya batti…"
        className="min-h-[44px] min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-slate"
      />
      <button type="submit" className="btn btn-navy min-h-[38px] px-4">
        Search
      </button>
    </form>
  );
}

export default function Header() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);

  // Cart and login state live in localStorage, so read them only after
  // mount — reading during render would not match the server HTML.
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    getCategories().then((items) => {
      if (!cancelled) setCategories(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (usesLegacyChrome(pathname)) return null;

  const cartCount = mounted ? items.reduce((sum, i) => sum + i.qty, 0) : 0;
  const accountHref = loggedIn ? "/account" : "/login";
  const accountLabel = loggedIn ? "Account" : "Login";

  const navLinks = [
    { label: "Home", href: "/" },
    ...categories.slice(0, NAV_CATEGORY_LIMIT).map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    { label: "Festival Samagri", href: "/festival" },
    { label: "All Products", href: "/shop" },
  ];

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="site-container flex items-center gap-3 py-3 md:gap-7">
          <button
            type="button"
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center text-navy md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={24} />
          </button>

          <Link href="/" aria-label={`${BRAND.name} home`} className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
            <Image
              src={BRAND.logoMark}
              alt=""
              width={249}
              height={157}
              priority
              className="h-10 w-auto md:h-[52px]"
            />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-[15px] font-bold tracking-[0.06em] text-navy md:text-[19px]">
                {BRAND.wordmark}
              </span>
              <span className="mt-1 hidden text-[10px] font-semibold tracking-[0.32em] text-gold-ink md:block">
                {BRAND.since}
              </span>
            </span>
          </Link>

          <SearchForm className="hidden flex-1 md:flex" />

          <nav aria-label="Account and cart" className="flex items-center md:gap-2">
            <Link
              href={accountHref}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 text-[13px] font-medium text-navy hover:text-navy-hover"
            >
              <Icon name="user" />
              <span className="hidden lg:inline">{accountLabel}</span>
              <span className="sr-only lg:hidden">{accountLabel}</span>
            </Link>
            <Link
              href="/cart"
              className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 text-[13px] font-semibold text-navy hover:text-navy-hover"
            >
              <Icon name="cart" />
              <span aria-hidden="true" className="hidden lg:inline">Cart</span>
              <span className="sr-only">
                {cartCount > 0 ? `Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "Cart"}
              </span>
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy lg:static"
                >
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Search sits on its own row on phones */}
        <div className="site-container pb-3 md:hidden">
          <SearchForm />
        </div>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden border-t border-mist md:block">
          <ul className="site-container flex flex-wrap items-center gap-x-9 text-sm font-medium">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`inline-flex min-h-[52px] items-center border-b-2 hover:text-navy-hover ${
                    isActive(link.href) ? "border-gold font-semibold" : "border-transparent"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="ml-auto">
              <Link
                href={loggedIn ? "/account" : "/login?next=/account"}
                className="inline-flex min-h-[52px] items-center gap-2 text-slate hover:text-navy"
              >
                <Icon name="truck" size={18} />
                Track order
              </Link>
            </li>
          </ul>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <nav id="mobile-menu" aria-label="Menu" className="border-t border-line bg-white md:hidden">
            <ul className="site-container flex flex-col py-2">
              {[
                { label: "Home", href: "/" },
                ...categories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
                { label: "Festival Samagri", href: "/festival" },
                { label: "All Products", href: "/shop" },
                { label: loggedIn ? "My Account" : "Login", href: accountHref },
              ].map((link) => (
                <li key={link.href} className="border-b border-mist last:border-b-0">
                  <Link
                    href={link.href}
                    className="flex min-h-[48px] items-center justify-between text-[15px] font-medium"
                  >
                    {link.label}
                    <Icon name="chevronRight" size={18} className="text-slate" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}