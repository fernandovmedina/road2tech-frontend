"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { formatMoney, formatShortDate, formatUnits } from "@/lib/copilot/format";
import type { ScenarioPoint } from "@/types/copilot";

import { ChartTooltip } from "../ui/ChartTooltip";

export type ScenarioMetric = "units" | "revenue";

type Row = { date: string; baseline: number; strategy: number; baselineWaste: number; strategyWaste: number };

type ScenarioChartProps = {
  baseline: ScenarioPoint[];
  strategy: ScenarioPoint[];
  metric: ScenarioMetric;
  validFrom: string;
  validTo: string;
};

const format = (metric: ScenarioMetric, value: number) => (metric === "units" ? formatUnits(value) : formatMoney(value));

/** Baseline (no action) vs strategy for the same days; the shaded band is the promotion period. */
export function ScenarioChart({ baseline, strategy, metric, validFrom, validTo }: ScenarioChartProps) {
  const rows: Row[] = baseline.map((b, i) => ({
    date: b.date,
    baseline: b[metric],
    strategy: strategy[i]?.[metric] ?? b[metric],
    baselineWaste: b.waste_units,
    strategyWaste: strategy[i]?.waste_units ?? b.waste_units,
  }));

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
    if (!row) return null;
    return (
      <ChartTooltip
        title={formatShortDate(row.date)}
        rows={[
          { label: "With strategy", value: format(metric, row.strategy), swatch: "var(--sc-series-1)" },
          { label: "No action", value: format(metric, row.baseline), swatch: "var(--sc-series-baseline)", dashed: true },
          { label: "Waste (strategy / no action)", value: `${formatUnits(row.strategyWaste)} / ${formatUnits(row.baselineWaste)}` },
        ]}
      />
    );
  };

  return (
    <figure className="w-full">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: metric === "units" ? -12 : 4 }}>
            <CartesianGrid stroke="var(--sc-grid)" vertical={false} />
            <ReferenceArea x1={validFrom} x2={validTo} fill="var(--sc-accent-soft)" fillOpacity={0.9} ifOverflow="extendDomain" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              minTickGap={24}
              tick={{ fill: "var(--sc-ink-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--sc-axis)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--sc-ink-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={metric === "units" ? 44 : 60}
              tickFormatter={(v: number) => (metric === "units" ? formatUnits(v) : `$${formatUnits(v)}`)}
            />
            <Tooltip content={renderTooltip} cursor={{ stroke: "var(--sc-axis)", strokeWidth: 1 }} />
            <Line dataKey="baseline" stroke="var(--sc-series-baseline)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line dataKey="strategy" stroke="var(--sc-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t-2 border-[var(--sc-series-1)]" /> With strategy
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-[var(--sc-series-baseline)]" /> No action (baseline)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm bg-accent-soft ring-1 ring-line" /> Promotion period
        </span>
      </figcaption>
    </figure>
  );
}
