// components/home/Hero.jsx — "Make Every Morning Sacred"
//
// HERO_IMAGE: put a real photo (lit diya, flowers, incense, pooja thali) in
// /public/brand and set its path here. Until then the panel shows the brand
// logo on a white tile rather than a stock or invented image.

import Image from "next/image";
import Link from "next/link";
import { BRAND } from "../../lib/theme";

const HERO_IMAGE = null; // e.g. "/brand/hero.jpg"

export default function Hero({ essentialsHref = "/shop", kitsHref = "/shop" }) {
  return (
    <section className="bg-navy text-white">
      <div className="site-container flex flex-col gap-10 py-10 md:flex-row md:items-center md:gap-14 md:py-[72px]">
        <div className="flex flex-1 flex-col gap-5">
          <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-gold md:text-xs">
            {BRAND.tagline}
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-[1.1] text-white md:text-5xl lg:text-6xl">
            Make Every Morning Sacred
          </h1>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-slate-light md:text-lg">
            From essential samagri to complete pooja kits, everything your home mandir needs, delivered to your
            doorstep.
          </p>
          <div className="flex flex-col gap-3 pt-1.5 sm:flex-row">
            <Link href={essentialsHref} className="btn btn-gold">
              Shop daily essentials
            </Link>
            <Link href={kitsHref} className="btn btn-outline-light">
              Explore pooja kits
            </Link>
          </div>
        </div>

        <div className="relative flex-1 pb-4 pl-4">
          {/* Offset gold frame behind the panel */}
          <div aria-hidden="true" className="absolute bottom-0 left-0 right-4 top-4 rounded-md border border-gold" />
          <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-md bg-white md:h-[420px]">
            {HERO_IMAGE ? (
              <Image
                src={HERO_IMAGE}
                alt="A lit diya with flowers, incense and a pooja thali"
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <Image
                src={BRAND.logoFull}
                alt={`${BRAND.name}, since 2026`}
                width={302}
                height={183}
                priority
                className="h-auto w-[62%] max-w-[302px]"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
