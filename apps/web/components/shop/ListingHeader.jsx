// components/shop/ListingHeader.jsx
// Off-white band at the top of listing pages: breadcrumb, title, intro.
// `crumbs` is [{ label, href? }] — the last one is the current page.

import Link from "next/link";

export default function ListingHeader({ crumbs = [], title, description }) {
  return (
    <div className="border-b border-line bg-offwhite">
      <div className="site-container flex flex-col gap-2.5 py-6 md:py-7">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-x-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                {c.href ? (
                  <Link href={c.href} className="inline-flex min-h-[32px] items-center hover:text-navy">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="heading-display text-[28px] md:text-[40px]">{title}</h1>
        {description && <p className="max-w-[640px] text-slate">{description}</p>}
      </div>
    </div>
  );
}
