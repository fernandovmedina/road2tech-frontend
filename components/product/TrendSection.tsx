"use client";

import { useTendency } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { TrendChart } from "./TrendChart";
import type { Strategy } from "@/types";

const P = copy.product;

/** Trend card: chart (history, forecast bands, treated series, strategy window) plus drivers, risks and AI summary. */
export function TrendSection({ storeId, productId, strategy }: { storeId: string; productId: string; strategy: Strategy | null }) {
  const tendency = useTendency(storeId, productId);
  const driverText: Record<string, { label: string; text: string }> = copy.strategy.drivers;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">{P.chart.title}</h2>
        <p className="text-sm text-muted">{P.chart.subtitle}</p>
      </div>
      {tendency.isPending ? (
        <Skeleton className="h-[300px]" />
      ) : tendency.isError ? (
        <ErrorState onRetry={() => void tendency.refetch()} />
      ) : tendency.data.history.length === 0 && tendency.data.forecast.length === 0 ? (
        <EmptyState title={P.chart.emptyTitle} text={P.chart.emptyText} />
      ) : (
        <>
          <TrendChart
            history={tendency.data.history}
            forecast={tendency.data.forecast}
            treated={tendency.data.treated}
            window={strategy ? { start: strategy.period.start_date, end: strategy.period.end_date } : null}
          />
          {tendency.data.ai_summary && (
            <div className="rounded-[10px] bg-primary-tint p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">{P.chart.aiSummary}</p>
              <p className="mt-1">{tendency.data.ai_summary}</p>
            </div>
          )}
          {tendency.data.drivers.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{P.chart.drivers}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {tendency.data.drivers.map((d) => (
                  <li key={d} className="rounded-full bg-[#EEF1F0] px-2.5 py-1 text-xs font-semibold">{driverText[d]?.label ?? t("forecastDriver", d)}</li>
                ))}
              </ul>
            </div>
          )}
          {tendency.data.risks.length > 0 && (
            <div className="rounded-[10px] border border-[#E8C26A] bg-[#FFF4D6] p-3 text-sm text-[#6B4500]">
              <p className="font-bold">{P.chart.risks}</p>
              <ul className="mt-1 list-disc pl-5">
                {tendency.data.risks.map((r) => (
                  <li key={`${r.code}-${r.message}`}>{r.message}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
