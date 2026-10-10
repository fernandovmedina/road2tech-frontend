type ToolLoadingCardProps = { label: string; steps?: string[] };

/** Skeleton shown while a tool runs (no spinners). */
export function ToolLoadingCard({ label, steps }: ToolLoadingCardProps) {
  return (
    <section aria-busy="true" aria-live="polite" className="my-2 w-full rounded-card border border-line bg-card px-5 py-4 text-foreground">
      <p className="text-sm font-medium text-muted">{label}</p>
      {steps ? <p className="mt-1 text-xs text-subtle">{steps.join(" → ")}</p> : null}
      <div className="mt-4 grid grid-cols-3 gap-3 motion-safe:animate-pulse">
        <div className="h-14 rounded-block bg-background" />
        <div className="h-14 rounded-block bg-background" />
        <div className="h-14 rounded-block bg-background" />
      </div>
      <div className="mt-3 h-40 rounded-block bg-background motion-safe:animate-pulse" />
    </section>
  );
}
