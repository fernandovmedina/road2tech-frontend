"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { ConstraintsList } from "@/components/strategy/ConstraintsList";
import { MeasurementResult } from "@/components/strategy/MeasurementResult";
import { StrategyActions } from "@/components/strategy/StrategyActions";
import { discountLabel, isBlockedByConstraint, notRecommendedText } from "@/components/strategy/strategyFormat";
import { CalculationDetails } from "./CalculationDetails";
import { NoPromoCard } from "./NoPromoCard";
import { ProductMetrics } from "./ProductMetrics";
import { PromoSlider } from "./PromoSlider";
import { StrategyComparison } from "./StrategyComparison";
import { TrendSection } from "./TrendSection";
import { figuresAt, isAdjustable, sliderMaxPct, toFraction, treatedRatio } from "./promoCurve";
import type { Product, Strategy, StrategyDetail } from "@/types";

const B = copy.product.blocked;

export type PromoState = "loading" | "error" | "none" | "ready";

/**
 * The two rows of the detail screen. Row 1: trend card (chart + four tiles) on the left, "Promoción sugerida" on the
 * right. Row 2: "Qué ganas y qué pierdes" with the actions. Everything that depends on the chosen discount lives here:
 * the slider only picks a point of the discount curve the backend delivered with the strategy, so moving it makes no
 * request and no money is calculated in the browser. Render with `key={draft_id}` so the choice resets per strategy.
 */
export function ProductContent({
  product,
  storeId,
  storeName,
  strategy,
  state,
  onRetry,
  onChanged,
}: {
  product: Product;
  storeId: string;
  storeName: string;
  strategy: StrategyDetail | null;
  state: PromoState;
  onRetry: () => void;
  onChanged: (next: Strategy) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const ready = state === "ready" && strategy !== null;
  const adjustable = ready && isAdjustable(strategy);
  const blocked = ready && strategy.status === "rejected" && isBlockedByConstraint(strategy);

  // Adjustable: the user's choice, starting at the engine's optimum. Otherwise the discount that was actually applied.
  const discount = !ready
    ? 0
    : adjustable
      ? Math.min(chosen ?? strategy.optimal_discount_pct, toFraction(sliderMaxPct(strategy)))
      : strategy.proposed_discount_pct;
  const point = ready ? figuresAt(strategy, discount) : null;
  const wasteUnits = ready && strategy.promoted_product_id === product.product_id ? strategy.baseline.waste_units : null;

  return (
    <>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <TrendSection
            storeId={storeId}
            productId={product.product_id}
            storeName={storeName}
            window={ready ? { start: strategy.period.start_date, end: strategy.period.end_date } : null}
            treatedRatio={ready && point ? treatedRatio(strategy, point) : null}
            treatedLabel={point ? copy.product.chart.treatedAt(discountLabel(point.discount_pct)) : undefined}
            comparing={ready && !blocked}
          />
          <ProductMetrics product={product} storeId={storeId} expectedWasteUnits={wasteUnits} />
        </div>

        {state === "loading" && <Skeleton className="h-[420px] w-full rounded-card" />}
        {state === "error" && <ErrorState onRetry={onRetry} />}
        {state === "none" && <NoPromoCard storeName={storeName} />}
        {ready && blocked && (
          <Card className="flex flex-col gap-3 border-alert/30 bg-alert-tint/40">
            <h2 className="text-lg font-bold text-alert-dark">{B.title}</h2>
            <p className="text-sm font-semibold">{notRecommendedText(strategy)}</p>
            <p className="text-sm text-muted">{B.text}</p>
            <ConstraintsList constraints={strategy.constraints} rejected />
          </Card>
        )}
        {ready && !blocked && <PromoSlider strategy={strategy} storeName={storeName} discount={discount} onDiscount={setChosen} />}
      </div>

      {state === "loading" && <Skeleton className="h-72 w-full rounded-card" />}

      {ready && !blocked && point && (
        <StrategyComparison strategy={strategy} point={point}>
          <StrategyActions
            strategy={strategy}
            onChanged={onChanged}
            showDetailLink={false}
            variant="promo"
            discountPct={adjustable ? discount : undefined}
            estimate={{ marginIncrement: point.expected_margin_increment, interval: point.confidence_interval }}
          />
        </StrategyComparison>
      )}

      {ready && strategy.status === "measured" && <MeasurementResult strategy={strategy} />}

      {ready && !blocked && point && <CalculationDetails strategy={strategy} point={point} />}
    </>
  );
}
