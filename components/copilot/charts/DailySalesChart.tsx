"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { copy } from "@/lib/copy";
import { formatMoney, formatMoneyShort, formatShortDate } from "@/lib/copilot/format";
import type { SeriesPoint } from "@/types/copilot";

import { ChartTooltip } from "../ui/ChartTooltip";

type DailySalesChartProps = { series: SeriesPoint[] };

function SalesTooltip({ active, payload }: TooltipContentProps) {
  const row = active ? (payload?.[0]?.payload as SeriesPoint | undefined) : undefined;
  if (!row) return null;
  return <ChartTooltip title={formatShortDate(row.date)} rows={[{ label: copy.copilot.overview.sales, value: formatMoney(row.value), swatch: "var(--color-series-scenario)" }]} />;
}

export function DailySalesChart({ series }: DailySalesChartProps) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            minTickGap={28}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-axis)" }}
            tickLine={false}
          />
          <YAxis tickFormatter={formatMoneyShort} tick={{ fill: "var(--color-subtle)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={SalesTooltip} cursor={{ stroke: "var(--color-axis)", strokeWidth: 1 }} />
          <Area dataKey="value" stroke="var(--color-series-scenario)" strokeWidth={2} fill="color-mix(in srgb, var(--color-series-scenario) 16%, transparent)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
