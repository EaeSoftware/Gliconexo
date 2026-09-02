import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type SettingsRowTone = "default" | "danger" | "muted";

export type SettingsRowContentProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  trailing?: ReactNode;
  tone?: SettingsRowTone;
};

const toneTextClasses: Record<SettingsRowTone, string> = {
  default: "text-foreground",
  danger: "text-status-below",
  muted: "text-foreground/50",
};

const toneIconClasses: Record<SettingsRowTone, string> = {
  default: "bg-surface-muted text-brand-blue",
  danger: "bg-status-below/10 text-status-below",
  muted: "bg-surface-muted text-foreground/40",
};

const rowClasses =
  "flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors";
const interactiveClasses =
  "hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";

export function SettingsRowContent({
  icon: Icon,
  label,
  description,
  trailing,
  tone = "default",
  showChevron = false,
}: SettingsRowContentProps & { showChevron?: boolean }) {
  return (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneIconClasses[tone]}`}
      >
        <Icon aria-hidden="true" size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className={`text-[15px] font-medium ${toneTextClasses[tone]}`}>{label}</span>
        {description ? (
          <span className="text-sm text-foreground/60">{description}</span>
        ) : null}
      </span>
      {trailing ? (
        <span className="shrink-0 text-sm text-foreground/60">{trailing}</span>
      ) : null}
      {showChevron ? (
        <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-foreground/30" />
      ) : null}
    </>
  );
}

export function SettingsLinkRow({
  href,
  ...props
}: SettingsRowContentProps & { href: string }) {
  return (
    <Link href={href} className={`${rowClasses} ${interactiveClasses}`}>
      <SettingsRowContent {...props} showChevron />
    </Link>
  );
}

export function SettingsButtonRow({
  className,
  ...props
}: SettingsRowContentProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { icon, label, description, trailing, tone, ...buttonProps } = props;
  return (
    <button
      type="button"
      className={`${rowClasses} ${interactiveClasses} ${className ?? ""}`}
      {...buttonProps}
    >
      <SettingsRowContent icon={icon} label={label} description={description} trailing={trailing} tone={tone} />
    </button>
  );
}

export function SettingsStaticRow(props: SettingsRowContentProps) {
  return (
    <div className={rowClasses}>
      <SettingsRowContent {...props} />
    </div>
  );
}

export function SettingsDisclosureRow({
  children,
  ...props
}: SettingsRowContentProps & { children: ReactNode }) {
  return (
    <details className="group">
      <summary
        className={`${rowClasses} ${interactiveClasses} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        <SettingsRowContent {...props} />
        <ChevronRight
          aria-hidden="true"
          size={20}
          className="shrink-0 text-foreground/30 transition-transform duration-200 group-open:rotate-90"
        />
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}

export function SettingsGroup({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section className="flex flex-col gap-2">
      {title ? (
        <h2 className="px-1 text-sm font-semibold text-foreground/60">{title}</h2>
      ) : null}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {children}
      </div>
    </section>
  );
}
