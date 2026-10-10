import { StatusMessage } from "@/components/ui/StatusMessage";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatSignedPercent } from "@/lib/format";
import { WEEKDAY_LABELS } from "@/lib/opportunities/labels";
import type { BaselineRow } from "@/lib/opportunities/predictionInsights";
import type { Weekday } from "@/types/weekday";

type BaselineDemandPanelProps = {
  weekday: Weekday;
  rows: readonly BaselineRow[];
};

/** Scenario 1: demand on a normal day, with no events applied. */
export function BaselineDemandPanel({ weekday, rows }: BaselineDemandPanelProps) {
  const weekdayLabel = WEEKDAY_LABELS[weekday];

  if (rows.length === 0) {
    return (
      <StatusMessage
        tone="empty"
        title={copy.opportunities.baseline.emptyTitle(weekdayLabel)}
        description={copy.opportunities.baseline.emptyDescription}
      />
    );
  }

  const sortedRows = [...rows].sort((a, b) => b.changePct - a.changePct);
  const maxMagnitude = Math.max(1, ...rows.map((row) => Math.abs(row.changePct)));

  return (
    <article className="flex flex-col gap-5" aria-label={copy.opportunities.baseline.aria(weekdayLabel)}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {copy.opportunities.baseline.eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          {copy.opportunities.baseline.title(weekdayLabel)}
        </h2>
        <p className="mt-1 text-sm text-muted">{copy.opportunities.baseline.description}</p>
      </header>

      <ul className="flex flex-col gap-1.5" aria-label={copy.opportunities.baseline.ariaList(weekdayLabel)}>
        {sortedRows.map((row) => {
          const isIncrease = row.changePct >= 0;
          return (
            <li
              key={row.productId}
              className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm"
            >
              <span className="truncate text-foreground">{row.productName}</span>
              <span className="relative h-2.5" aria-hidden>
                <span className="absolute -inset-y-1 left-1/2 w-px bg-axis" />
                <span
                  className={cn(
                    "absolute inset-y-0 bg-series-baseline",
                    isIncrease ? "left-1/2 rounded-r-[4px]" : "right-1/2 rounded-l-[4px]",
                  )}
                  style={{ width: `${(Math.abs(row.changePct) / maxMagnitude) * 50}%` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums text-foreground">
                {formatSignedPercent(row.changePct)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="rounded-block bg-background px-3 py-2 text-xs text-muted">
        {copy.opportunities.baseline.footnote}
      </p>
    </article>
  );
}
