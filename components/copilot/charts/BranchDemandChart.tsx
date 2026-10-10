"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatInteger, formatPct, formatUnits } from "@/lib/copilot/format";

import { ChartTooltip } from "../ui/ChartTooltip";

export type BranchRow = { name: string; units: number; changePct: number; next7: number };

type BranchDemandChartProps = { rows: BranchRow[]; days: number };

/** Horizontal bars (one hue) sorted by recent units, so the leaders read top to bottom. */
export function BranchDemandChart({ rows, days }: BranchDemandChartProps) {
  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const row = active ? (payload?.[0]?.payload as BranchRow | undefined) : undefined;
    if (!row) return null;
    return (
      <ChartTooltip
        title={row.name}
        rows={[
          { label: `Units, last ${days} days`, value: formatInteger(row.units), swatch: "var(--sc-series-1)" },
          { label: "vs previous period", value: formatPct(row.changePct) },
          { label: "Forecast, next 7 days", value: formatUnits(row.next7) },
        ]}
      />
    );
  };
  return (
    <div className="w-full" style={{ height: Math.max(160, rows.length * 26 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={4}>
          <CartesianGrid stroke="var(--sc-grid)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--sc-ink-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--sc-axis)" }} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fill: "var(--sc-ink-secondary)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={renderTooltip} cursor={{ fill: "var(--sc-surface-muted)" }} />
          <Bar dataKey="units" fill="var(--sc-series-1)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
