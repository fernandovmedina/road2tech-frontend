"use client";

import { PackageX, Receipt, ShoppingCart, Sparkles, TrendingDown } from "lucide-react";
import { useChainSummary, useStoreKpis, type Scope } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDecimal, formatMoney, formatMoneyExact, formatNumber } from "@/lib/format";
import { Kpi } from "@/components/ui/Kpi";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

const K = copy.dashboard.kpi;

/** Backend deltas are fractions (0.034 = +3.4 %). Formatting only. */
function formatSignedFraction(v: number): string {
  return `${v >= 0 ? "+" : "−"}${(Math.abs(v) * 100).toFixed(1)}%`;
}

export function KpiCards({ scope }: { scope: Scope }) {
  const { branchId, mode, range } = scope;
  const chain = useChainSummary({ mode, range });
  const store = useStoreKpis(branchId, { mode, range });
  const query = branchId === "all" ? chain : store;
  const kpis = query.data?.kpis;

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (!kpis) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-busy>
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[124px] rounded-card" />)}
      </div>
    );
  }

  const aiHint =
    branchId === "all" && chain.data
      ? K.aiHintChain(chain.data.portfolio_impact.strategies_count, chain.data.portfolio_impact.stores_with_plan)
      : K.aiHint;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi
        label={K.averageTicket}
        value={formatMoneyExact(kpis.average_ticket)}
        icon={Receipt}
        tone="primary"
        caption={K.vsPrev}
        delta={{ value: formatSignedFraction(kpis.average_ticket_delta_pct), positive: kpis.average_ticket_delta_pct >= 0 }}
      />
      <Kpi
        label={K.itemsPerTicket}
        value={formatDecimal(kpis.items_per_ticket)}
        icon={ShoppingCart}
        tone="neutral"
        caption={K.vsPrev}
        delta={{ value: formatSignedFraction(kpis.items_per_ticket_delta_pct), positive: kpis.items_per_ticket_delta_pct >= 0 }}
      />
      <Kpi
        label={K.stockouts}
        value={formatNumber(kpis.stockout_products)}
        icon={PackageX}
        tone="alert"
      />
      <Kpi
        label={K.noDemand}
        value={formatNumber(kpis.no_demand_products)}
        icon={TrendingDown}
        tone="info"
      />
      <Kpi
        label={K.aiOpportunity}
        value={formatMoney(kpis.ai_opportunity_mxn)}
        icon={Sparkles}
        tone="accent"
        variant="highlight"
        caption={aiHint}
      />
    </div>
  );
}
