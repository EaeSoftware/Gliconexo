import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
};

export function StatCard({ label, value, unit, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2 text-foreground/60">
        {Icon ? <Icon aria-hidden="true" size={16} strokeWidth={2.25} /> : null}
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">
        {value} {unit ? <span className="text-sm font-normal text-foreground/60">{unit}</span> : null}
      </p>
    </div>
  );
}
