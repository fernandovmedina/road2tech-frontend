type StatTileProps = {
  label: string;
  value: string;
  caption?: string;
};

export function StatTile({ label, value, caption }: StatTileProps) {
  return (
    <div className="rounded-xl border border-ink/10 bg-surface px-4 py-3">
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {caption && <p className="mt-0.5 truncate text-xs text-ink-secondary">{caption}</p>}
    </div>
  );
}
