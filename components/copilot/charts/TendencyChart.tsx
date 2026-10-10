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

import { formatShortDate, formatUnits } from "@/lib/copilot/format";
import type { ForecastPoint, SeriesPoint } from "@/types/copilot";

import { ChartTooltip } from "../ui/ChartTooltip";

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
    rows.push({ label: "Units sold", value: formatUnits(row.history), swatch: "var(--sc-series-1)" });
  } else if (row.forecast !== undefined) {
    rows.push({ label: "Forecast (P50)", value: formatUnits(row.forecast), swatch: "var(--sc-series-1)", dashed: true });
    if (row.band) rows.push({ label: "P80 – P90", value: `${formatUnits(row.band[0])} – ${formatUnits(row.band[1])}` });
  }
  return <ChartTooltip title={formatShortDate(row.date)} rows={rows} />;
}

/** Solid line = history, dashed = forecast P50, light band = P80–P90 (one series, one hue). */
export function TendencyChart({ history, forecast, dataAsOf }: TendencyChartProps) {
  const rows = buildRows(history, forecast);
  return (
    <figure className="w-full">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--sc-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              minTickGap={28}
              tick={{ fill: "var(--sc-ink-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--sc-axis)" }}
              tickLine={false}
            />
            <YAxis tick={{ fill: "var(--sc-ink-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={TendencyTooltip} cursor={{ stroke: "var(--sc-axis)", strokeWidth: 1 }} />
            <ReferenceLine x={dataAsOf} stroke="var(--sc-axis)" strokeDasharray="2 3" label={{ value: "Today", position: "insideTopRight", fill: "var(--sc-ink-muted)", fontSize: 11 }} />
            <Area dataKey="band" stroke="none" fill="var(--sc-series-1-band)" isAnimationActive={false} connectNulls={false} />
            <Line dataKey="history" stroke="var(--sc-series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line
              dataKey="forecast"
              stroke="var(--sc-series-1)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t-2 border-[var(--sc-series-1)]" /> Units sold (history)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-[var(--sc-series-1)]" /> Forecast (P50)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm bg-[var(--sc-series-1-band)]" /> P80–P90 range
        </span>
      </figcaption>
    </figure>
  );
}
