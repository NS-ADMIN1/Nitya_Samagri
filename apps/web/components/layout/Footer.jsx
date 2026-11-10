"use client";

// components/layout/Footer.jsx
//
// Site footer. Every link points at a page that exists today; policy pages
// (shipping, returns, privacy, terms) get added here once they are written.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCategories } from "../../lib/catalog";
import { BRAND, usesLegacyChrome } from "../../lib/theme";
import Icon from "../ui/Icon";

const FOOTER_CATEGORY_LIMIT = 5;

function FooterColumn({ title, children }) {
  return (
    <div className="flex min-w-[150px] flex-col gap-2.5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">{title}</h2>
      {children}
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link href={href} className="inline-flex min-h-[32px] items-center text-sm text-slate-light hover:text-gold">
      {children}
    </Link>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getCategories().then((items) => {
      if (!cancelled) setCategories(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (usesLegacyChrome(pathname)) return null;

  return (
    <footer className="bg-navy-deep text-slate-light">
      <div className="site-container flex flex-wrap gap-x-14 gap-y-10 pb-10 pt-14">
        <div className="flex max-w-[320px] flex-1 basis-[260px] flex-col gap-4">
          {/* The logo is shown unaltered on its own white tile */}
          <div className="self-start rounded-md bg-white px-3.5 py-2">
            <Image
              src={BRAND.logoFull}
              alt={`${BRAND.name}, since 2026`}
              width={302}
              height={183}
              className="h-24 w-auto"
            />
          </div>
          <p className="text-sm leading-relaxed">{BRAND.tagline}.</p>
        </div>

        <FooterColumn title="Shop">
          {categories.slice(0, FOOTER_CATEGORY_LIMIT).map((c) => (
            <FooterLink key={c._id} href={`/category/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
          <FooterLink href="/festival">Festival Samagri</FooterLink>
          <FooterLink href="/shop">All Products</FooterLink>
        </FooterColumn>

        <FooterColumn title="Your account">
          <FooterLink href="/account">My Account</FooterLink>
          <FooterLink href="/account">Track Order</FooterLink>
          <FooterLink href="/reviews">My Reviews</FooterLink>
          <FooterLink href="/cart">Cart</FooterLink>
        </FooterColumn>

        <FooterColumn title="Contact">
          <a href={`mailto:${BRAND.email}`} className="inline-flex min-h-[32px] items-center gap-2 text-sm hover:text-gold">
            <Icon name="mail" size={16} />
            {BRAND.email}
          </a>
          <a href={BRAND.phoneHref} className="inline-flex min-h-[32px] items-center gap-2 text-sm hover:text-gold">
            <Icon name="phone" size={16} />
            {BRAND.phone}
          </a>
          <span className="inline-flex min-h-[32px] items-center gap-2 text-sm">
            <Icon name="pin" size={16} />
            {BRAND.location}
          </span>
        </FooterColumn>
      </div>

      <div className="border-t border-navy-line">
        <div className="site-container flex flex-wrap justify-between gap-3 py-4 text-[13px]">
          <span>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </span>
          <span>Secure payments by Razorpay · UPI · Cards · Net banking · COD</span>
        </div>
      </div>
    </footer>
  );
}