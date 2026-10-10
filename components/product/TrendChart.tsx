"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { copy } from "@/lib/copy";
import { formatDate, formatDecimal } from "@/lib/format";
import type { Tendency } from "@/types";

const C = copy.product.chart;

export type TrendWindow = { start: string; end: string };

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
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Clamps the strategy window to the dates the chart really has (a category axis ignores unknown dates). */
function clampWindow(rows: Row[], window: TrendWindow | null | undefined): TrendWindow | null {
  if (!window || rows.length === 0) return null;
  const inside = rows.filter((r) => r.date >= window.start && r.date <= window.end);
  if (inside.length === 0) return null;
  return { start: inside[0].date, end: inside[inside.length - 1].date };
}

/**
 * Demand trend: solid = history, dashed = forecast, shaded bands = P50-P80 and P80-P90 from the backend,
 * orange = forecast with the strategy (only when the backend sends it), shaded block = strategy window.
 * Also used by the chat (`forecast_chart` block).
 */
export function TrendChart({
  history,
  forecast,
  treated,
  window: strategyWindow,
  height = 300,
  compact = false,
  ariaLabel = C.aria,
}: {
  history: Tendency["history"];
  forecast: Tendency["forecast"];
  treated?: Tendency["treated"];
  window?: TrendWindow | null;
  height?: number;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const rows = useMemo(() => toRows(history, forecast, treated), [history, forecast, treated]);
  const win = useMemo(() => clampWindow(rows, strategyWindow), [rows, strategyWindow]);
  const hasTreated = (treated?.length ?? 0) > 0;
  const hasBands = forecast.length > 0;

  return (
    <div>
      <div style={{ height }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#E3E8E6" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "#5B6776" }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#5B6776" }} width={44} />
            <Tooltip
              labelFormatter={(l) => formatDate(String(l))}
              formatter={(v, n) => [Array.isArray(v) ? `${formatDecimal(v[0])}–${formatDecimal(v[1])}` : formatDecimal(Number(v)), n]}
            />
            {win && (
              <ReferenceArea x1={win.start} x2={win.end} fill="#E8590C" fillOpacity={0.09} stroke="#E8590C" strokeOpacity={0.3} strokeDasharray="3 3" ifOverflow="visible" />
            )}
            <Area dataKey="outer" name={C.bandOuter} stroke="none" fill="#5B6776" fillOpacity={0.1} isAnimationActive={false} />
            <Area dataKey="inner" name={C.bandInner} stroke="none" fill="#5B6776" fillOpacity={0.22} isAnimationActive={false} />
            <Line dataKey="history" name={C.history} stroke="#0B6E4F" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="forecast" name={C.forecast} stroke="#5B6776" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
            {hasTreated && <Line dataKey="treated" name={C.treated} stroke="#E8590C" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!compact && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-muted">
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-primary" />{C.history}</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-0 w-5 border-t-2 border-dashed border-muted" />{C.forecast}</li>
          {hasTreated && <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-accent" />{C.treated}</li>}
          {hasBands && <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm bg-muted/30" />{C.bandInner}</li>}
          {hasBands && <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm bg-muted/15" />{C.bandOuter}</li>}
          {win && <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm bg-accent/20" />{C.window}</li>}
        </ul>
      )}
    </div>
  );
}
