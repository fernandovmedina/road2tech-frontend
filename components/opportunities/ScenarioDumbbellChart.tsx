import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatInteger, formatSignedPercent, formatSignedPoints } from "@/lib/format";
import type { ScenarioRow } from "@/lib/opportunities/predictionInsights";

type ChartView = "chart" | "table";

const VIEW_OPTIONS = [
  { value: "chart", label: copy.opportunities.dumbbell.chart },
  { value: "table", label: copy.opportunities.dumbbell.table },
] as const satisfies readonly { value: ChartView; label: string }[];

const ROW_GRID = "grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_4.5rem] items-center gap-3";

/** Shared x-scale with clean ticks that always includes zero. */
function buildScale(values: readonly number[]) {
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const span = Math.max(1, rawMax - rawMin);
  const step = [5, 10, 20, 25, 50, 100].find((candidate) => span / candidate <= 6) ?? 100;
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let tick = min; tick <= max; tick += step) ticks.push(tick);
  return {
    ticks,
    toPercent: (value: number) => ((value - min) / (max - min || 1)) * 100,
  };
}

type ScenarioDumbbellChartProps = {
  rows: readonly ScenarioRow[];
  normalLabel: string;
  eventLabel: string;
};

/** Before → after per product: normal day (light) to event day (dark). */
export function ScenarioDumbbellChart({ rows, normalLabel, eventLabel }: ScenarioDumbbellChartProps) {
  const [view, setView] = useState<ChartView>("chart");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const scale = useMemo(
    () => buildScale(rows.flatMap((row) => [row.scenarios.normalDayPct, row.scenarios.withEventPct])),
    [rows],
  );

  return (
    <section aria-labelledby="scenario-chart-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="scenario-chart-heading" className="text-sm font-semibold text-foreground">
          {copy.opportunities.dumbbell.title}
        </h3>
        <SegmentedControl
          label={copy.opportunities.dumbbell.displayAs}
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "chart" ? (
        <div className="flex flex-col gap-1">
          <ul className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-series-baseline" aria-hidden />
              {normalLabel}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-series-scenario" aria-hidden />
              {eventLabel}
            </li>
          </ul>

          <div className={cn(ROW_GRID, "text-xs text-muted")} aria-hidden>
            <span>{copy.opportunities.dumbbell.product}</span>
            <span>{copy.opportunities.dumbbell.vsAverage}</span>
            <span className="text-right">{copy.opportunities.dumbbell.effect}</span>
          </div>

          <ul aria-label={copy.opportunities.dumbbell.ariaList}>
            {rows.map((row) => {
              const { normalDayPct, withEventPct } = row.scenarios;
              const normalX = scale.toPercent(normalDayPct);
              const eventX = scale.toPercent(withEventPct);
              const isActive = activeRowId === row.productId;
              return (
                <li
                  key={row.productId}
                  tabIndex={0}
                  aria-label={copy.opportunities.dumbbell.rowAria(
                    row.productName,
                    normalLabel,
                    formatSignedPercent(normalDayPct),
                    eventLabel,
                    formatSignedPercent(withEventPct),
                    formatSignedPoints(row.effectPp),
                  )}
                  onPointerEnter={() => setActiveRowId(row.productId)}
                  onPointerLeave={() => setActiveRowId(null)}
                  onFocus={() => setActiveRowId(row.productId)}
                  onBlur={() => setActiveRowId(null)}
                  className={cn(
                    ROW_GRID,
                    "relative rounded-md py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive && "bg-foreground/5",
                  )}
                >
                  <span className="truncate text-sm text-foreground">{row.productName}</span>
                  <div className="relative h-6" aria-hidden>
                    {scale.ticks.map((tick) => (
                      <span
                        key={tick}
                        className={cn("absolute inset-y-0 w-px", tick === 0 ? "bg-axis" : "bg-line")}
                        style={{ left: `${scale.toPercent(tick)}%` }}
                      />
                    ))}
                    <span
                      className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-series-scenario/35"
                      style={{
                        left: `${Math.min(normalX, eventX)}%`,
                        width: `${Math.abs(eventX - normalX)}%`,
                      }}
                    />
                    <span
                      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-series-baseline ring-2 ring-card"
                      style={{ left: `${normalX}%` }}
                    />
                    <span
                      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-series-scenario ring-2 ring-card"
                      style={{ left: `${eventX}%` }}
                    />
                    {isActive && (
                      <div
                        className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-control bg-foreground px-2.5 py-1.5 text-xs text-white shadow-lg"
                        style={{ left: `${Math.min(80, Math.max(20, eventX))}%` }}
                      >
                        <p className="flex items-center gap-1.5">
                          <span className="h-0.5 w-3 rounded bg-series-baseline" />
                          <span className="font-semibold">{formatSignedPercent(normalDayPct)}</span>
                          <span className="text-white/70">{normalLabel}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="h-0.5 w-3 rounded bg-white" />
                          <span className="font-semibold">{formatSignedPercent(withEventPct)}</span>
                          <span className="text-white/70">{eventLabel}</span>
                        </p>
                        <p className="pl-[18px]">
                          <span className="font-semibold">{formatSignedPoints(row.effectPp)}</span>{" "}
                          <span className="text-white/70">{copy.opportunities.dumbbell.tooltipEffect}</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatSignedPoints(row.effectPp)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className={ROW_GRID} aria-hidden>
            <span />
            <div className="relative h-4">
              {scale.ticks.map((tick, index) => (
                <span
                  key={tick}
                  className={cn(
                    "absolute top-0 text-[10px] tabular-nums text-muted",
                    index === scale.ticks.length - 1
                      ? "-translate-x-full"
                      : index > 0 && "-translate-x-1/2",
                  )}
                  style={{ left: `${scale.toPercent(tick)}%` }}
                >
                  {formatSignedPercent(tick)}
                </span>
              ))}
            </div>
            <span />
          </div>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="pb-2 font-medium">{copy.opportunities.dumbbell.product}</th>
              <th scope="col" className="pb-2 text-right font-medium">{normalLabel}</th>
              <th scope="col" className="pb-2 text-right font-medium">{eventLabel}</th>
              <th scope="col" className="pb-2 text-right font-medium">{copy.opportunities.dumbbell.effect}</th>
              <th scope="col" className="pb-2 text-right font-medium">{copy.opportunities.dumbbell.extraStock}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row) => (
              <tr key={row.productId} className="border-t border-line">
                <th scope="row" className="py-2 pr-2 text-left font-medium text-foreground">
                  {row.productName}
                </th>
                <td className="py-2 text-right text-foreground">{formatSignedPercent(row.scenarios.normalDayPct)}</td>
                <td className="py-2 text-right text-foreground">{formatSignedPercent(row.scenarios.withEventPct)}</td>
                <td className="py-2 text-right font-semibold text-foreground">{formatSignedPoints(row.effectPp)}</td>
                <td className="py-2 text-right text-foreground">+{formatInteger(row.recommendedExtraUnits)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
