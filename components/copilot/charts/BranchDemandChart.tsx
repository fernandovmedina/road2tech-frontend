"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { copy } from "@/lib/copy";
import { formatInteger, formatPct, formatUnits } from "@/lib/copilot/format";

import { ChartTooltip } from "../ui/ChartTooltip";

export const C = copy.copilot.demand;

type BranchRow = { name: string; units: number; changePct: number; next7: number };

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
          { label: C.tipUnits(days), value: formatInteger(row.units), swatch: "var(--color-series-scenario)" },
          { label: C.tipVsPrevious, value: formatPct(row.changePct) },
          { label: C.tipNext7, value: formatUnits(row.next7) },
        ]}
      />
    );
  };
  return (
    <div className="w-full" style={{ height: Math.max(160, rows.length * 26 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={4}>
          <CartesianGrid stroke="var(--color-line)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--color-subtle)", fontSize: 11 }} axisLine={{ stroke: "var(--color-axis)" }} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={renderTooltip} cursor={{ fill: "var(--color-background)" }} />
          <Bar dataKey="units" fill="var(--color-series-scenario)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
