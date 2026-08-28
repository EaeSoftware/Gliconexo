import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS = {
  primary:
    "bg-brand-blue text-white shadow-md hover:bg-brand-blue/90 hover:shadow-lg focus-visible:outline-brand-blue",
  secondary:
    "bg-brand-navy text-white shadow-md hover:bg-brand-navy/90 hover:shadow-lg focus-visible:outline-brand-navy",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-muted focus-visible:outline-brand-blue",
  ghost:
    "text-foreground hover:bg-surface-muted focus-visible:outline-brand-blue",
} as const;

type Variant = keyof typeof VARIANTS;

const baseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${VARIANTS[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({ href, variant = "primary", className, children }: ButtonLinkProps) {
  return (
    <Link href={href} className={`${baseClasses} ${VARIANTS[variant]} ${className ?? ""}`}>
      {children}
    </Link>
  );
}
