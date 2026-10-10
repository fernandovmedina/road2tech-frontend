import { StatusMessage } from "@/components/ui/StatusMessage";
import { cn } from "@/lib/cn";
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
        title={`No base demand for a normal ${weekdayLabel} yet`}
        description="Normal-day demand per product appears here once there is sales history to compare against."
      />
    );
  }

  const sortedRows = [...rows].sort((a, b) => b.changePct - a.changePct);
  const maxMagnitude = Math.max(1, ...rows.map((row) => Math.abs(row.changePct)));

  return (
    <article className="flex flex-col gap-5" aria-label={`Normal ${weekdayLabel}`}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Scenario 1 · Base demand
        </p>
        <h2 className="mt-1 text-lg font-semibold text-ink">Normal {weekdayLabel}</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Expected demand with no events, as % change versus an average day.
        </p>
      </header>

      <ul className="flex flex-col gap-1.5" aria-label={`Normal ${weekdayLabel} demand by product`}>
        {sortedRows.map((row) => {
          const isIncrease = row.changePct >= 0;
          return (
            <li
              key={row.productId}
              className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm"
            >
              <span className="truncate text-ink">{row.productName}</span>
              <span className="relative h-2.5" aria-hidden>
                <span className="absolute -inset-y-1 left-1/2 w-px bg-axis" />
                <span
                  className={cn(
                    "absolute inset-y-0 bg-normal-day",
                    isIncrease ? "left-1/2 rounded-r-[4px]" : "right-1/2 rounded-l-[4px]",
                  )}
                  style={{ width: `${(Math.abs(row.changePct) / maxMagnitude) * 50}%` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums text-ink">
                {formatSignedPercent(row.changePct)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="rounded-lg bg-plane px-3 py-2 text-xs text-ink-secondary">
        This is the baseline every event is compared against. Choose{" "}
        <span className="font-semibold text-ink">Scenario comparison</span> to see how an event
        changes it.
      </p>
    </article>
  );
}
