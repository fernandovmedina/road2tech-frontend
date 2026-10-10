"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { copy } from "@/lib/copy";
import { formatDate, formatDecimal } from "@/lib/format";
import { DataLegend, type DataLegendItem } from "@/components/ui/DataLegend";
import type { Tendency } from "@/types";

const C = copy.product.chart;

export type TrendWindow = { start: string; end: string };

// Chart colors come from the canonical tokens (never hex literals): green = history, orange dashed = forecast,
// dark blue = treated series ("Si aceptas") and an orange tint for the uncertainty band.
const HISTORY = "var(--color-primary)";
const FORECAST = "var(--color-accent)";
const TREATED = "var(--color-series-scenario)";
const BAND = "var(--color-accent)";
const AXIS = "var(--color-axis)";
const TICK = "var(--color-muted)";

type Row = {
  date: string;
  history?: number;
  forecast?: number;
  treated?: number;
  // Bands come straight from the backend quantiles: P50-P80 (inner) and P80-P90 (outer). Nothing is invented.
  inner?: [number, number];
  outer?: [number, number];
};

function toRows(history: Tendency["history"], forecast: Tendency["forecast"], treated: Tendency["treated"] | undefined): Row[] {
  const map = new Map<string, Row>();
  const row = (date: string) => {
    let r = map.get(date);
    if (!r) {
      r = { date };
      map.set(date, r);
    }
    return r;
  };
  for (const p of history) row(p.date).history = p.value;
  for (const p of forecast) {
    const r = row(p.date);
    r.forecast = p.value;
    r.inner = [Math.min(p.p50, p.p80), Math.max(p.p50, p.p80)];
    r.outer = [Math.min(p.p80, p.p90), Math.max(p.p80, p.p90)];
  }
  for (const p of treated ?? []) row(p.date).treated = p.value;
  const rows = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));

  // The dashed and orange lines start at the last real day so they leave from the green line instead of floating.
  const today = [...rows].reverse().find((r) => r.history !== undefined);
  if (today && forecast.length > 0) {
    today.forecast ??= today.history;
    if (treated && treated.length > 0) today.treated ??= today.history;
  }
  return rows;
}

/** Clamps the strategy window to the dates the chart really has (a category axis ignores unknown dates). */
function clampWindow(rows: Row[], window: TrendWindow | null | undefined): TrendWindow | null {
  if (!window || rows.length === 0) return null;
  const inside = rows.filter((r) => r.date >= window.start && r.date <= window.end);
  if (inside.length === 0) return null;
  return { start: inside[0].date, end: inside[inside.length - 1].date };
}

/**
 * Demand trend: solid green = history, dashed orange = forecast, shaded bands = P50-P80 and P80-P90 from the backend,
 * dark blue = forecast with the promotion (only when a treated series is given), shaded block = promotion window.
 */
export function TrendChart({
  history,
  forecast,
  treated,
  window: strategyWindow,
  treatedLabel = C.treated,
  forecastLabel = C.forecast,
  height = 300,
  ariaLabel = C.aria,
}: {
  history: Tendency["history"];
  forecast: Tendency["forecast"];
  treated?: Tendency["treated"];
  window?: TrendWindow | null;
  /** Tooltip name of the treated series, e.g. "Con promoción (12%)". */
  treatedLabel?: string;
  /** Legend/tooltip name of the dashed series: "Sin promoción" when a promotion is being compared, else "Pronóstico". */
  forecastLabel?: string;
  height?: number;
  ariaLabel?: string;
}) {
  const rows = useMemo(() => toRows(history, forecast, treated), [history, forecast, treated]);
  const win = useMemo(() => clampWindow(rows, strategyWindow), [rows, strategyWindow]);
  const hasTreated = (treated?.length ?? 0) > 0;
  const hasBands = forecast.length > 0;

  // Only three x labels, as in the approved design: first day, today (last real day) and last forecast day.
  const first = rows[0]?.date;
  const last = rows[rows.length - 1]?.date;
  const today = history.length > 0 ? history[history.length - 1].date : undefined;
  const ticks = [first, today, last].filter((d, i, all): d is string => !!d && all.indexOf(d) === i);
  const tickLabel = (d: string) =>
    d === today && forecast.length > 0 ? C.today : d === first && history.length > 0 && d !== today ? C.daysAgo(history.length) : d === last && forecast.length > 0 ? C.daysAhead(forecast.length) : formatDate(d);

  const legendItems: DataLegendItem[] = [
    { color: HISTORY, label: C.history, shape: "line" },
    { color: FORECAST, label: forecastLabel, shape: "dashed" },
    ...(hasTreated ? [{ color: TREATED, label: treatedLabel, shape: "line" as const }] : []),
    ...(hasBands ? [{ color: BAND, label: C.bandInner, shape: "band" as const }] : []),
  ];

  return (
    <div>
      <DataLegend items={legendItems} label={ariaLabel} className="mb-2" />
      <div style={{ height }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={AXIS} vertical={false} />
            <XAxis dataKey="date" ticks={ticks} interval={0} tickFormatter={tickLabel} tick={{ fontSize: 11, fill: TICK }} tickMargin={6} />
            <YAxis tick={{ fontSize: 11, fill: TICK }} width={44} allowDecimals={false} domain={[0, (max: number) => Math.ceil(max * 1.12)]} />
            <Tooltip
              cursor={{ stroke: AXIS }}
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-line)",
                borderRadius: "var(--radius-block)",
                boxShadow: "var(--shadow-card)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-muted)", fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
              labelFormatter={(l) => formatDate(String(l))}
              formatter={(v, n) => [Array.isArray(v) ? `${formatDecimal(v[0])}–${formatDecimal(v[1])}` : formatDecimal(Number(v)), n]}
            />
            {win && (
              <ReferenceArea
                x1={win.start}
                x2={win.end}
                fill={BAND}
                fillOpacity={0.1}
                stroke="none"
                ifOverflow="visible"
                label={{ value: C.window, position: "insideTop", fill: "var(--color-accent-dark)", fontSize: 11, fontWeight: 700 }}
              />
            )}
            {today && forecast.length > 0 && <ReferenceLine x={today} stroke={TICK} strokeDasharray="3 3" strokeOpacity={0.6} />}
            <Area dataKey="outer" name={C.bandOuter} stroke="none" fill={BAND} fillOpacity={0.1} isAnimationActive={false} />
            <Area dataKey="inner" name={C.bandInner} stroke="none" fill={BAND} fillOpacity={0.22} isAnimationActive={false} />
            <Line dataKey="history" name={C.history} stroke={HISTORY} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="forecast" name={forecastLabel} stroke={FORECAST} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
            {hasTreated && <Line dataKey="treated" name={treatedLabel} stroke={TREATED} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
