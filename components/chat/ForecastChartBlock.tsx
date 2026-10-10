"use client";

import Link from "next/link";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDate, formatDecimal } from "@/lib/format";
import { productHref } from "@/lib/links";
import type { BlockOf } from "./chatTypes";

const C = copy.chat.forecast;

type Row = {
  date: string;
  history?: number;
  forecast?: number;
  treated?: number;
  bandP80?: [number, number];
  bandP90?: [number, number];
};

// solid green = history, dashed gray = forecast, orange = with promotion, shaded bands = real P50-P80 / P50-P90
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

  return (
    <section className="w-full max-w-3xl rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{C.title(name)}</h3>
        <Link
          href={productHref(block.product_id, { storeId: block.store_id })}
          className="inline-flex min-h-11 items-center rounded-[10px] px-2 text-sm font-semibold text-primary hover:bg-primary-tint"
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
                <CartesianGrid stroke="#E3E8E6" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "#5B6776" }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#5B6776" }} width={44} />
                <Tooltip
                  labelFormatter={(l) => formatDate(String(l))}
                  formatter={(v, n) => [
                    Array.isArray(v) ? `${formatDecimal(Number(v[0]))}–${formatDecimal(Number(v[1]))}` : formatDecimal(Number(v)),
                    n,
                  ]}
                />
                <Area dataKey="bandP90" name={C.bandP90} stroke="none" fill="#5B6776" fillOpacity={0.1} isAnimationActive={false} />
                <Area dataKey="bandP80" name={C.bandP80} stroke="none" fill="#5B6776" fillOpacity={0.18} isAnimationActive={false} />
                <Line dataKey="history" name={C.history} stroke="#0B6E4F" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
                <Line dataKey="forecast" name={C.forecast} stroke="#5B6776" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
                {hasTreated && (
                  <Line dataKey="treated" name={C.treated} stroke="#E8590C" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-muted">
            <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-primary" />{C.history}</li>
            <li className="flex items-center gap-1.5"><span aria-hidden className="h-0 w-5 border-t-2 border-dashed border-muted" />{C.forecast}</li>
            {hasTreated && <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-accent" />{C.treated}</li>}
            <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm bg-muted/30" />{C.bandP80}</li>
            <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm bg-muted/15" />{C.bandP90}</li>
            <li className="ml-auto">{C.unit}</li>
          </ul>
        </>
      )}
    </section>
  );
}
