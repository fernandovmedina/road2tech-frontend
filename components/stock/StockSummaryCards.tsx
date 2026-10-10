import { copy } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { StockSummary } from "@/types";
import { STOCK_STATUSES, statusText } from "./statusStyles";

/** Four counts straight from GET /stock/summary (never counted from the loaded rows). */
export function StockSummaryCards({ summary, loading }: { summary: StockSummary | undefined; loading: boolean }) {
  return (
    <section aria-label={copy.stock.summaryLabel} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {STOCK_STATUSES.map((s) => (
        <Card key={s}>
          <p className="text-sm font-semibold text-muted">{t("stockStatus", s)}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-16" />
          ) : (
            <p className={`mt-2 text-[32px] font-extrabold leading-none tabular-nums ${statusText[s]}`}>
              {summary ? formatNumber(summary[s]) : copy.stock.none}
            </p>
          )}
        </Card>
      ))}
    </section>
  );
}
