type EditorialStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function EditorialStatCard({ label, value, hint }: EditorialStatCardProps) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-4 shadow-sm">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground/50">{hint}</p> : null}
    </div>
  );
}
