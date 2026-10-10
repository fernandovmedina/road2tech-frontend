import { AlertTriangle, Boxes, TrendingUp, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatInteger, formatSignedPercent } from "@/lib/format";
import type { StoreDemandSummary } from "@/lib/api/storeDemand";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";

/** Totals come from the backend (`summary`) when present; the demo generator has none, so they are added up here. */
export function StoreDemandKpis({ predictions, summary }: { predictions: readonly StoreDemandPrediction[]; summary?: StoreDemandSummary | null }) {
  const totalDemand = summary?.predictedDailyDemand ?? predictions.reduce((sum, prediction) => sum + prediction.predictedDailyDemand, 0);
  const averageUplift = summary?.averageUpliftPct ?? (predictions.length
    ? predictions.reduce((sum, prediction) => sum + prediction.upliftPct, 0) / predictions.length
    : 0);
  const atRisk = summary?.storesAtRisk ?? predictions.filter((prediction) => prediction.risk !== "healthy").length;
  const extraUnits = summary?.recommendedExtraUnits ?? predictions.reduce((sum, prediction) => sum + prediction.recommendedExtraUnits, 0);
  const stats = [
    { label: "Forecast demand", value: `${formatInteger(totalDemand)} units/day`, caption: `Across ${summary?.storesCount ?? 25} branches`, icon: TrendingUp, tone: "text-brand bg-brand-soft" },
    { label: "Average uplift", value: formatSignedPercent(averageUplift), caption: "Compared with current demand", icon: Warehouse, tone: "text-[#7f4b00] bg-[#fff0d2]" },
    { label: "Branches to watch", value: `${atRisk}`, caption: "Low stock coverage", icon: AlertTriangle, tone: "text-critical bg-[#fbe2e2]" },
    { label: "Suggested extra stock", value: `${formatInteger(extraUnits)} units`, caption: "Four-day target", icon: Boxes, tone: "text-[#16785f] bg-[#d9f0e8]" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex items-center gap-3 px-4 py-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.tone}`}>
            <stat.icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-secondary">{stat.label}</p>
            <p className="mt-0.5 truncate text-xl font-semibold tracking-tight text-ink">{stat.value}</p>
            <p className="truncate text-[11px] text-ink-muted">{stat.caption}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
