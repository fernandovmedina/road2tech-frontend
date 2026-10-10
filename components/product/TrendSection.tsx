"use client";

import { useMemo, type ReactNode } from "react";
import { useTendency } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { scaleTreated } from "./promoCurve";
import { TrendChart, type TrendWindow } from "./TrendChart";

const C = copy.product.chart;

/**
 * "Tendencia de demanda y predicción" card: the chart and, below it (`children`), the four metric tiles. With a
 * promotion it also shows the promotion window and the orange series; `treatedRatio` re-draws that series for the
 * discount chosen on the slider (see `scaleTreated`, visual only).
 */
export function TrendSection({
  storeId,
  productId,
  storeName,
  window,
  treatedRatio = null,
  treatedLabel,
  comparing = false,
  children,
}: {
  storeId: string;
  productId: string;
  storeName: string;
  window?: TrendWindow | null;
  treatedRatio?: number | null;
  treatedLabel?: string;
  /** True when a promotion is being compared: the dashed line is then "Sin promoción" instead of "Pronóstico". */
  comparing?: boolean;
  children?: ReactNode;
}) {
  const tendency = useTendency(storeId, productId);
  const { forecast, treated } = tendency.data ?? {};
  const shownTreated = useMemo(() => scaleTreated(forecast ?? [], treated ?? null, treatedRatio), [forecast, treated, treatedRatio]);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">{C.title}</h2>
        <p className="text-sm text-muted">
          {C.subtitle(storeName, tendency.data?.history.length ?? 30, tendency.data?.forecast.length ?? 14)}
        </p>
      </div>
      {tendency.isPending ? (
        <Skeleton className="h-[300px]" />
      ) : tendency.isError ? (
        <ErrorState onRetry={() => void tendency.refetch()} />
      ) : tendency.data.history.length === 0 && tendency.data.forecast.length === 0 ? (
        <EmptyState title={C.emptyTitle} text={C.emptyText} />
      ) : (
        <TrendChart
          history={tendency.data.history}
          forecast={tendency.data.forecast}
          treated={shownTreated}
          window={window}
          treatedLabel={treatedLabel}
          forecastLabel={comparing ? C.forecastNoPromo : C.forecast}
        />
      )}
      {children}
    </Card>
  );
}
