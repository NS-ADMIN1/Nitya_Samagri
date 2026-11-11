// apps/admin/components/ui/Field.tsx
//
// Form building blocks: a labelled wrapper (Field) plus Input, Select and
// Textarea that share one look. Always pass the same `id` to Field and the
// control inside it so the label is linked.

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const CONTROL =
  "w-full rounded-[10px] border border-field bg-white px-3 font-sans text-sm text-navy outline-none placeholder:text-slate focus:border-navy disabled:bg-mist disabled:text-slate";

interface FieldProps {
  id: string;
  label: string;
  /** Short hint under the control. */
  helper?: string;
  /** Validation message; replaces the helper and is announced to screen readers. */
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, helper, error, children }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-navy">
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-xs font-medium text-danger">
          {error}
        </span>
      ) : (
        helper && <span className="text-xs text-slate">{helper}</span>
      )}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "prefix"> {
  /** Unit shown in a grey box before the value, e.g. "₹" or "%". */
  prefix?: string;
  invalid?: boolean;
}

export function Input({ prefix, invalid = false, ...rest }: InputProps) {
  const border = invalid ? "border-danger" : "border-field";
  if (!prefix) {
    return <input aria-invalid={invalid || undefined} className={`${CONTROL} h-11 ${invalid ? "border-danger" : ""}`} {...rest} />;
  }
  return (
    <div className={`flex h-11 items-center overflow-hidden rounded-[10px] border bg-white focus-within:border-navy ${border}`}>
      <span className="flex h-full items-center border-r border-line bg-mist px-3 text-sm text-slate">{prefix}</span>
      <input
        aria-invalid={invalid || undefined}
        className="h-full min-w-0 flex-1 bg-transparent px-3 font-sans text-sm text-navy outline-none placeholder:text-slate"
        {...rest}
      />
    </div>
  );
}

export function Select({ children, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">) {
  return (
    <select className={`${CONTROL} h-11`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ rows = 3, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  return <textarea rows={rows} className={`${CONTROL} resize-y py-2.5`} {...rest} />;
}
