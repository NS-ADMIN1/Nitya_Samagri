// components/home/TrustStrip.jsx
//
// Only statements that are true of the site as built: no delivery-time,
// free-shipping or return-window promises until those policies are
// confirmed and can be managed from Admin.

import Icon from "../ui/Icon";

const POINTS = [
  { icon: "diya", title: "Made for daily worship", text: "A focused range for your home mandir" },
  { icon: "lock", title: "Secure checkout", text: "UPI, cards, net banking and cash on delivery" },
  { icon: "truck", title: "Doorstep delivery", text: "Track every order from your account" },
  { icon: "shield", title: "Honest listings", text: "Real products, real prices, real reviews" },
];

export default function TrustStrip() {
  return (
    <section aria-label="Why shop with us" className="border-b border-line">
      <ul className="site-container grid grid-cols-1 gap-x-7 gap-y-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p) => (
          <li key={p.title} className="flex items-start gap-3.5">
            <Icon name={p.icon} size={28} className="text-gold-ink" />
            <div>
              <p className="text-[15px] font-semibold">{p.title}</p>
              <p className="text-[13px] text-slate">{p.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
