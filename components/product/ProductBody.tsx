"use client";

import { useCatalog, useStore, useStorePlan, useTendency } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConstraintsList } from "@/components/strategy/ConstraintsList";
import { MeasurementResult } from "@/components/strategy/MeasurementResult";
import { StatusTimeline } from "@/components/strategy/StatusTimeline";
import { StrategyActions } from "@/components/strategy/StrategyActions";
import { statusTone } from "@/components/strategy/strategyFormat";
import { useLiveStrategy } from "@/components/strategy/useLiveStrategy";
import { ProductMetrics } from "./ProductMetrics";
import { StrategyComparison } from "./StrategyComparison";
import { StrategyReasons } from "./StrategyReasons";
import { TrendSection } from "./TrendSection";

const P = copy.product;

/** Product + store detail: metrics, trend, and (when the plan has one for this product) the strategy comparison. */
export function ProductBody({ productId, storeId, strategyId }: { productId: string; storeId: string; strategyId?: string }) {
  const catalog = useCatalog();
  const store = useStore(storeId);
  const plan = useStorePlan(storeId);
  const tendency = useTendency(storeId, productId);

  // The requested strategy (?strategy=) or, without it, the plan's strategy for this product.
  const strategies = plan.data?.strategies;
  const found =
    (strategyId ? strategies?.find((s) => s.draft_id === strategyId) : strategies?.find((s) => s.promoted_product_id === productId || s.anchor_product_id === productId)) ?? null;
  const [live, updateLive] = useLiveStrategy(found);
  const strategy = live && (!strategyId || live.draft_id === strategyId) ? live : null;

  const product = catalog.byId.get(productId);

  if (catalog.isError) return <ErrorState onRetry={() => void catalog.refetch()} />;
  if (catalog.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!product) return <EmptyState title={copy.common.notFoundTitle} text={P.notFound} />;

  const subtitle = P.subtitle(t("category", product.category_id), product.brand, store ? displayBranchName(store) : "");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={product.product_name} subtitle={subtitle}>
        {strategy && <Badge tone={statusTone[strategy.status]}>{t("strategyStatus", strategy.status)}</Badge>}
      </PageHeader>

      <ProductMetrics product={product} storeId={storeId} forecast={tendency.data?.forecast} />
      <TrendSection storeId={storeId} productId={productId} strategy={strategy} />

      {plan.isPending && strategyId ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : plan.isError ? (
        <ErrorState onRetry={() => void plan.refetch()} />
      ) : strategy ? (
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent-dark">{P.strategy.kicker}</p>
            <h2 className="text-xl font-extrabold">{strategy.title}</h2>
            <p className="text-sm text-muted">
              {t("strategyType", strategy.strategy_type)} · {formatDate(strategy.period.start_date)} – {formatDate(strategy.period.end_date)}
            </p>
          </div>
          <StrategyComparison strategy={strategy} />
          <div className="grid gap-6 xl:grid-cols-2">
            <StrategyReasons strategy={strategy} />
            <Card className="flex flex-col gap-4">
              <h2 className="text-lg font-extrabold">{P.strategy.statusTitle}</h2>
              <StatusTimeline status={strategy.status} />
              <ConstraintsList constraints={strategy.constraints} rejected={strategy.status === "rejected"} />
              {strategy.status === "measured" && <MeasurementResult strategy={strategy} />}
              <StrategyActions strategy={strategy} onChanged={updateLive} showDetailLink={false} />
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState
          title={strategyId ? P.strategy.missingTitle : P.strategy.noneTitle}
          text={strategyId ? P.strategy.missingText : P.strategy.noneText}
        />
      )}
    </div>
  );
}
