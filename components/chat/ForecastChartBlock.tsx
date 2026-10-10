"use client";

import Link from "next/link";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDate, formatDecimal } from "@/lib/format";
import { productHref } from "@/lib/links";
import { DataLegend, type DataLegendItem } from "@/components/ui/DataLegend";
import type { BlockOf } from "./chatTypes";

const C = copy.chat.forecast;

// Same series colors as the product trend chart: green history, orange dashed forecast, dark-blue treated.
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
  bandP80?: [number, number];
  bandP90?: [number, number];
};

function toRows(block: BlockOf<"forecast_chart">): Row[] {
  const map = new Map<string, Row>();
  const row = (date: string) => {
    let r = map.get(date);
    if (!r) {
      r = { date };
      map.set(date, r);
    }
    return r;
  };
  for (const p of block.history) row(p.date).history = p.value;
  for (const p of block.forecast) {
    const r = row(p.date);
    r.forecast = p.value;
    r.bandP80 = [p.p50, p.p80];
    r.bandP90 = [p.p50, p.p90];
  }
  for (const p of block.treated ?? []) row(p.date).treated = p.value;
  // Visual join only: the last history point starts the forecast (and treated) lines so they touch.
  const last = block.history[block.history.length - 1];
  if (last) {
    const r = row(last.date);
    r.forecast ??= last.value;
    if (block.treated) r.treated ??= last.value;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Compact chart for chat replies. */
export function ForecastChartBlock({ block }: { block: BlockOf<"forecast_chart"> }) {
  const { nameOf } = useCatalog();
  const name = nameOf(block.product_id);
  const rows = toRows(block);
  const hasTreated = !!block.treated && block.treated.length > 0;

  const legendItems: DataLegendItem[] = [
    { color: HISTORY, label: C.history, shape: "line" },
    { color: FORECAST, label: C.forecast, shape: "dashed" },
    ...(hasTreated ? [{ color: TREATED, label: C.treated, shape: "line" as const }] : []),
    { color: BAND, label: C.bandP80, shape: "band" },
    { color: BAND, label: C.bandP90, shape: "band" },
  ];

  return (
    <section className="w-full max-w-3xl rounded-card border border-line bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{C.title(name)}</h3>
        <Link
          href={productHref(block.product_id, { storeId: block.store_id })}
          className="inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-primary hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {C.viewProduct}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{C.empty}</p>
      ) : (
        <>
          <div style={{ height: 220 }} role="img" aria-label={C.ariaLabel(name)}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={AXIS} vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: TICK }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: TICK }} width={44} />
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
                  formatter={(v, n) => [
                    Array.isArray(v) ? `${formatDecimal(Number(v[0]))}–${formatDecimal(Number(v[1]))}` : formatDecimal(Number(v)),
                    n,
                  ]}
                />
                <Area dataKey="bandP90" name={C.bandP90} stroke="none" fill={BAND} fillOpacity={0.1} isAnimationActive={false} />
                <Area dataKey="bandP80" name={C.bandP80} stroke="none" fill={BAND} fillOpacity={0.18} isAnimationActive={false} />
                <Line dataKey="history" name={C.history} stroke={HISTORY} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
                <Line dataKey="forecast" name={C.forecast} stroke={FORECAST} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
                {hasTreated && (
                  <Line dataKey="treated" name={C.treated} stroke={TREATED} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <DataLegend items={legendItems} label={C.ariaLabel(name)} />
            <span className="text-xs font-medium text-muted">{C.unit}</span>
          </div>
        </>
      )}
    </section>
  );
}
