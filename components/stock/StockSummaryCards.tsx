import { Boxes, CheckCircle2, PackageX, TrendingDown, type LucideIcon } from "lucide-react";
import { copy } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import { Kpi } from "@/components/ui/Kpi";
import { Skeleton } from "@/components/ui/Skeleton";
import type { StockStatus, StockSummary } from "@/types";
import { STOCK_STATUSES } from "./statusStyles";

const S = copy.stock;

const statusIcon: Record<StockStatus, LucideIcon> = {
  out: PackageX,
  low: TrendingDown,
  ok: CheckCircle2,
  over: Boxes,
};

const kpiTone = { out: "alert", low: "warning", ok: "primary", over: "info" } as const;

/** Four counts straight from GET /stock/summary (never counted from the loaded rows). */
export function StockSummaryCards({ summary, loading }: { summary: StockSummary | undefined; loading: boolean }) {
  if (loading) {
    return (
      <section aria-label={S.summaryLabel} aria-busy="true" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {STOCK_STATUSES.map((s) => <Skeleton key={s} className="h-[84px] rounded-card" />)}
      </section>
    );
  }
  return (
    <section aria-label={S.summaryLabel} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {STOCK_STATUSES.map((s) => (
        <Kpi
          key={s}
          label={t("stockStatus", s)}
          value={summary ? formatNumber(summary[s]) : S.none}
          icon={statusIcon[s]}
          tone={kpiTone[s]}
        />
      ))}
    </section>
  );
}
