type TooltipRow = { label: string; value: string; swatch?: string; dashed?: boolean };

type ChartTooltipProps = { title: string; rows: TooltipRow[] };

/** Tooltip body: text stays in ink colors; a small swatch carries the series identity. */
export function ChartTooltip({ title, rows }: ChartTooltipProps) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center justify-between gap-4 text-ink-secondary">
          <span className="flex items-center gap-1.5">
            {row.swatch ? (
              <span
                aria-hidden
                className="inline-block h-0 w-3"
                style={{ borderTop: `2px ${row.dashed ? "dashed" : "solid"} ${row.swatch}` }}
              />
            ) : null}
            {row.label}
          </span>
          <span className="tabular font-medium text-ink">{row.value}</span>
        </p>
      ))}
    </div>
  );
}
