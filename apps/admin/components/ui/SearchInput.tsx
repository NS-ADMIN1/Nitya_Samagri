"use client";

// apps/admin/components/ui/SearchInput.tsx — the search box above every list.

import Icon from "./Icon";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Also used as the accessible name, e.g. "Search product or SKU". */
  placeholder: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder, className = "" }: SearchInputProps) {
  return (
    <label
      className={`flex h-11 min-w-0 max-w-[460px] flex-1 basis-80 items-center gap-2.5 rounded-[10px] border border-field bg-white px-3.5 text-slate focus-within:border-navy ${className}`}
    >
      <Icon name="search" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent font-sans text-sm text-navy outline-none placeholder:text-slate"
      />
    </label>
  );
}
