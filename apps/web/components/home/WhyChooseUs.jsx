// components/home/WhyChooseUs.jsx
// Brand statements only — no numbers, ratings or policy promises that the
// business has not confirmed.

import { BRAND } from "../../lib/theme";
import Icon from "../ui/Icon";

const REASONS = [
  {
    icon: "diya",
    title: "Made for daily worship",
    text: "A focused range for the home mandir, not a general store.",
  },
  {
    icon: "shield",
    title: "Honest listings",
    text: "Real products, real prices and reviews only from real orders.",
  },
  {
    icon: "box",
    title: "Kits that save a trip",
    text: "Complete pooja kits, so nothing is missing when you sit down to pray.",
  },
  {
    icon: "lock",
    title: "Easy, secure checkout",
    text: "Pay by UPI, card, net banking or cash on delivery.",
  },
];

export default function WhyChooseUs() {
  return (
    <section aria-labelledby="home-why" className="bg-navy">
      <div className="site-container section flex flex-col gap-8 md:gap-9">
        <h2 id="home-why" className="heading-display text-[26px] text-white md:text-[34px]">
          Why Choose {BRAND.name}
        </h2>
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <li key={r.title} className="flex flex-col gap-3 border-t-2 border-gold pt-5">
              <Icon name={r.icon} size={30} className="text-gold" />
              <h3 className="font-serif text-xl font-semibold text-white">{r.title}</h3>
              <p className="text-sm leading-relaxed text-slate-light">{r.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
