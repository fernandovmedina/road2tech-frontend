type ToolLoadingCardProps = { label: string; steps?: string[] };

/** Skeleton shown while a tool runs (no spinners). */
export function ToolLoadingCard({ label, steps }: ToolLoadingCardProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="my-2 w-full rounded-2xl border border-sc-line bg-sc-surface px-5 py-4 text-sc-ink"
    >
      <p className="text-sm font-medium text-sc-ink-secondary">{label}</p>
      {steps ? <p className="mt-1 text-xs text-sc-ink-muted">{steps.join(" → ")}</p> : null}
      <div className="mt-4 grid animate-pulse grid-cols-3 gap-3">
        <div className="h-14 rounded-xl bg-sc-surface-muted" />
        <div className="h-14 rounded-xl bg-sc-surface-muted" />
        <div className="h-14 rounded-xl bg-sc-surface-muted" />
      </div>
      <div className="mt-3 h-40 animate-pulse rounded-xl bg-sc-surface-muted" />
    </section>
  );
}
