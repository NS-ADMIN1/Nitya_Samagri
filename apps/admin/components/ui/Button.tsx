// apps/admin/components/ui/Button.tsx
//
// The one button for the admin. Pass `href` to get a link that looks the
// same. Default height is 44px so it is easy to hit on a phone; use
// size="sm" only inside dense table rows.

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

export type ButtonVariant = "primary" | "gold" | "ghost" | "quiet" | "danger";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "border-navy bg-navy text-white hover:bg-navy-hover",
  gold: "border-gold bg-gold text-navy hover:bg-gold-dark",
  ghost: "border-field bg-white text-navy hover:bg-mist",
  quiet: "border-transparent bg-transparent text-navy hover:bg-mist",
  danger: "border-danger-line bg-white text-danger hover:bg-danger-soft",
};

const SIZE = {
  md: "h-11 px-[18px] text-sm",
  sm: "h-9 px-3 text-[13px]",
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
  icon?: IconName;
  fullWidth?: boolean;
  /** Shows "Please wait…" and blocks clicks while a request is running. */
  loading?: boolean;
  /** Renders a link instead of a button. */
  href?: string;
  className?: string;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth = false,
  loading = false,
  href,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex min-w-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-sans font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT[variant],
    SIZE[size],
    fullWidth ? "w-full" : "",
    className,
  ].join(" ");

  const content = (
    <>
      {icon && <Icon name={icon} size={16} />}
      {loading ? "Please wait…" : children}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled || loading} className={classes} {...rest}>
      {content}
    </button>
  );
}
