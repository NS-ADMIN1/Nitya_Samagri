// components/ui/Accordion.jsx
// Collapsible sections built on the native <details> element, so they
// work with the keyboard and without JavaScript.

export function AccordionItem({ title, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="group border-t border-line">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-2xl font-normal leading-none text-gold-ink group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="hidden text-2xl font-normal leading-none text-gold-ink group-open:inline">
          −
        </span>
      </summary>
      <div className="pb-5 text-[15px] leading-relaxed text-slate">{children}</div>
    </details>
  );
}

export default function Accordion({ children }) {
  return <div className="border-b border-line">{children}</div>;
}
