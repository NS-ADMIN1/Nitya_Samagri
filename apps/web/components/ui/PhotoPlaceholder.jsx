// components/ui/PhotoPlaceholder.jsx
//
// Neutral tile shown wherever a product, category or kit has no real photo
// yet. It is deliberately plain — never a stock or invented image.

import Icon from "./Icon";

export default function PhotoPlaceholder({ icon = "diya", size = 32, dark = false, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-center justify-center ${
        dark ? "bg-navy-soft text-slate-light" : "bg-mist text-field"
      } ${className}`}
    >
      <Icon name={icon} size={size} strokeWidth={1.3} />
    </div>
  );
}
