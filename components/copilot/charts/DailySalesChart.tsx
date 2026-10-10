"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatMoney, formatMoneyShort, formatShortDate } from "@/lib/copilot/format";
import type { SeriesPoint } from "@/types/copilot";

import { ChartTooltip } from "../ui/ChartTooltip";

type DailySalesChartProps = { series: SeriesPoint[] };

function SalesTooltip({ active, payload }: TooltipContentProps) {
  const row = active ? (payload?.[0]?.payload as SeriesPoint | undefined) : undefined;
  if (!row) return null;
  return <ChartTooltip title={formatShortDate(row.date)} rows={[{ label: "Sales", value: formatMoney(row.value), swatch: "var(--sc-series-1)" }]} />;
}

export function DailySalesChart({ series }: DailySalesChartProps) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--sc-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            minTickGap={28}
            tick={{ fill: "var(--sc-ink-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--sc-axis)" }}
            tickLine={false}
          />
          <YAxis tickFormatter={formatMoneyShort} tick={{ fill: "var(--sc-ink-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={SalesTooltip} cursor={{ stroke: "var(--sc-axis)", strokeWidth: 1 }} />
          <Area dataKey="value" stroke="var(--sc-series-1)" strokeWidth={2} fill="var(--sc-series-1-band)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
