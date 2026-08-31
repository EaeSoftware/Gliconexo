import type { ReactNode } from "react";
import { FileText, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon = FileText, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-muted px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-brand-blue shadow-sm"
      >
        <Icon size={26} strokeWidth={1.75} />
      </span>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-foreground/70">{description}</p>
      {action}
    </div>
  );
}
