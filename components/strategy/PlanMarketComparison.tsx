"use client";

import { useState } from "react";
import { Globe2 } from "lucide-react";
import { apiErrorCode, useCatalog, useMarketComparison } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoneyExact, formatPct } from "@/lib/format";
import { MarketItemList } from "@/components/market/MarketItemList";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Strategy } from "@/types";

const M = copy.strategy.market;
const VISIBLE = 4;

/** Market evidence for one promoted product. It is requested when this mounts, i.e. after the user asked for the comparison. */
function PromotionMarket({ storeId, strategy }: { storeId: string; strategy: Strategy }) {
  const { byId } = useCatalog();
  const product = byId.get(strategy.promoted_product_id);
  const market = useMarketComparison(storeId, strategy.promoted_product_id, product ? M.query(product.product_name) : "", !!product);
  const [expanded, setExpanded] = useState(false);
  const items = market.data?.items ?? [];
  const facts = [product ? M.shelfPrice(formatMoneyExact(product.retail_price)) : null, M.discount(formatPct(strategy.proposed_discount_pct))];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="text-sm font-bold">{product?.product_name ?? strategy.promoted_product_id}</h4>
        <p className="text-xs font-medium text-muted">{facts.filter(Boolean).join(" · ")}</p>
      </div>

      {market.isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-block bg-alert-tint px-3 py-2 text-sm text-alert-dark">
          <p>{M.errors[apiErrorCode(market.error) ?? ""] ?? M.errors.fallback}</p>
          <Button variant="secondary" size="sm" onClick={() => void market.refetch()}>{copy.common.retry}</Button>
        </div>
      ) : market.isPending ? (
        <div role="status" aria-label={M.loading} className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28 rounded-block" />
          <Skeleton className="h-28 rounded-block" />
        </div>
      ) : (
        <>
          <MarketItemList items={expanded ? items : items.slice(0, VISIBLE)} />
          {items.length > VISIBLE && (
            <div>
              <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
                {expanded ? M.showLess : M.showMore(items.length - VISIBLE)}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * "Comparativa con el mercado" of the Plan comercial: for each recommended promotion, what Brave Search finds for the
 * same product in Mexico. It is evidence to judge the discount; nothing here feeds the plan's figures. Searches start
 * only when the user asks, so opening the dashboard never spends search quota.
 */
export function PlanMarketComparison({ storeId, strategies }: { storeId: string; strategies: Strategy[] }) {
  const [requested, setRequested] = useState(false);
  if (strategies.length === 0) return null;

  return (
    <section aria-labelledby="plan-market-title">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-2xl">
            <h3 id="plan-market-title" className="flex items-center gap-2 text-base font-bold">
              <Globe2 aria-hidden className="size-5 text-primary" />
              {M.title}
            </h3>
            <p className="mt-1 text-sm text-muted">{M.subtitle}</p>
          </div>
          {!requested && <Button variant="secondary" onClick={() => setRequested(true)}>{M.button}</Button>}
        </div>

        {requested && (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {strategies.map((s) => (
                <li key={s.draft_id} className="py-4 first:pt-0 last:pb-0">
                  <PromotionMarket storeId={storeId} strategy={s} />
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium text-muted">{copy.chat.market.disclaimer}</p>
          </>
        )}
      </Card>
    </section>
  );
}
