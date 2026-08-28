export function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">
        {value} {unit ? <span className="text-sm font-normal text-foreground/60">{unit}</span> : null}
      </p>
    </div>
  );
}
