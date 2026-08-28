import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon = "📄", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-muted px-6 py-12 text-center">
      <span aria-hidden="true" className="text-3xl">
        {icon}
      </span>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-foreground/70">{description}</p>
      {action}
    </div>
  );
}
