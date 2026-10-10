"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { copy } from "@/lib/copy";
import { formatDate, formatDecimal } from "@/lib/format";
import type { TrendPoint } from "@/types";

type Row = {
  date: string;
  history?: number;
  forecast?: number;
  promo?: number;
  band?: [number, number];
};

// solid = history, dashed = forecast, orange = forecast with promotion, shaded band = uncertainty
function toRows(points: TrendPoint[], withPromo: boolean): Row[] {
  const map = new Map<string, Row>();
  const get = (d: string) => {
    let r = map.get(d);
    if (!r) { r = { date: d }; map.set(d, r); }
    return r;
  };
  let lastHistory: TrendPoint | undefined;
  let forecastIdx = 0;
  for (const p of points) {
    const r = get(p.date);
    if (p.kind === "history") { r.history = p.value; lastHistory = p; }
    if (p.kind === "forecast") {
      forecastIdx++;
      r.forecast = p.value;
      const spread = 0.08 + forecastIdx * 0.012;
      r.band = [Math.round(p.value * (1 - spread) * 10) / 10, Math.round(p.value * (1 + spread) * 10) / 10];
    }
    if (p.kind === "forecast_promo" && withPromo) r.promo = p.value;
  }
  // connect history and forecast lines
  if (lastHistory) {
    const r = get(lastHistory.date);
    r.forecast = lastHistory.value;
    if (withPromo) r.promo = lastHistory.value;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function TrendChart({
  points,
  height = 300,
  withPromo = true,
  window: promoWindow,
  compact = false,
}: {
  points: TrendPoint[];
  height?: number;
  withPromo?: boolean;
  window?: { start: string; end: string } | null;
  compact?: boolean;
}) {
  const rows = toRows(points, withPromo);
  const C = copy.product.chart;
  return (
    <div>
      <div style={{ height }} role="img" aria-label={copy.assistant.chartTitle}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#E3E8E6" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "#5B6776" }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#5B6776" }} width={44} />
            <Tooltip
              labelFormatter={(l) => formatDate(String(l))}
              formatter={(v, n) => [Array.isArray(v) ? `${formatDecimal(v[0])}–${formatDecimal(v[1])}` : formatDecimal(Number(v)), n]}
            />
            {promoWindow && withPromo && (
              <ReferenceArea x1={promoWindow.start} x2={promoWindow.end} fill="#E8590C" fillOpacity={0.09} stroke="#E8590C" strokeOpacity={0.3} strokeDasharray="3 3" ifOverflow="visible" />
            )}
            <Area dataKey="band" name={C.band} stroke="none" fill="#5B6776" fillOpacity={0.14} isAnimationActive={false} />
            <Line dataKey="history" name={C.history} stroke="#0B6E4F" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="forecast" name={C.forecast} stroke="#5B6776" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
            {withPromo && <Line dataKey="promo" name={C.forecastPromo} stroke="#E8590C" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!compact && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-muted">
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-primary" />{C.history}</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-0 w-5 border-t-2 border-dashed border-muted" />{C.forecast}</li>
          {withPromo && <li className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-accent" />{C.forecastPromo}</li>}
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm bg-muted/20" />{C.band}</li>
          {promoWindow && withPromo && <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-5 rounded-sm bg-accent/20" />{C.window}</li>}
        </ul>
      )}
    </div>
  );
}
