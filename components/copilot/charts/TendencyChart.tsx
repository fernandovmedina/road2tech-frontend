"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { copy } from "@/lib/copy";
import { formatShortDate, formatUnits } from "@/lib/copilot/format";
import type { ForecastPoint, SeriesPoint } from "@/types/copilot";

import { ChartTooltip } from "../ui/ChartTooltip";

const C = copy.copilot.tendency.chart;

type Row = {
  date: string;
  history?: number;
  forecast?: number;
  band?: [number, number];
};

type TendencyChartProps = { history: SeriesPoint[]; forecast: ForecastPoint[]; dataAsOf: string };

function buildRows(history: SeriesPoint[], forecast: ForecastPoint[]): Row[] {
  const rows: Row[] = history.map((p) => ({ date: p.date, history: p.value }));
  const last = rows.at(-1);
  // Start the dashed forecast at the last actual point so the two lines connect.
  if (last && last.history !== undefined) last.forecast = last.history;
  for (const p of forecast) rows.push({ date: p.date, forecast: p.p50, band: [p.p80, p.p90] });
  return rows;
}

function TendencyTooltip({ active, payload }: TooltipContentProps) {
  const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
  if (!row) return null;
  const rows = [];
  if (row.history !== undefined) {
    rows.push({ label: C.sold, value: formatUnits(row.history), swatch: "var(--color-series-scenario)" });
  } else if (row.forecast !== undefined) {
    rows.push({ label: C.forecast, value: formatUnits(row.forecast), swatch: "var(--color-series-scenario)", dashed: true });
    if (row.band) rows.push({ label: C.p80p90, value: `${formatUnits(row.band[0])} – ${formatUnits(row.band[1])}` });
  }
  return <ChartTooltip title={formatShortDate(row.date)} rows={rows} />;
}

/** Solid line = history, dashed = forecast P50, light band = P80–P90 (one series, one hue). */
export function TendencyChart({ history, forecast, dataAsOf }: TendencyChartProps) {
  const rows = buildRows(history, forecast);
  return (
    <figure className="w-full" aria-label={C.aria}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              minTickGap={28}
              tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
              axisLine={{ stroke: "var(--color-axis)" }}
              tickLine={false}
            />
            <YAxis tick={{ fill: "var(--color-subtle)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={TendencyTooltip} cursor={{ stroke: "var(--color-axis)", strokeWidth: 1 }} />
            <ReferenceLine x={dataAsOf} stroke="var(--color-axis)" strokeDasharray="2 3" label={{ value: C.today, position: "insideTopRight", fill: "var(--color-subtle)", fontSize: 11 }} />
            <Area dataKey="band" stroke="none" fill="color-mix(in srgb, var(--color-series-scenario) 16%, transparent)" isAnimationActive={false} connectNulls={false} />
            <Line dataKey="history" stroke="var(--color-series-scenario)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line
              dataKey="forecast"
              stroke="var(--color-series-scenario)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t-2 border-[var(--color-series-scenario)]" /> {C.history}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-[var(--color-series-scenario)]" /> {C.forecast}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm bg-[color-mix(in_srgb,var(--color-series-scenario)_16%,transparent)]" /> {C.band}
        </span>
      </figcaption>
    </figure>
  );
}
