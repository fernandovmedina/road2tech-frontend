"use client";

import { useChainSummary, useStoreKpis, type Scope } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDecimal, formatMoney, formatMoneyExact, formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

const K = copy.dashboard.kpi;

/** Backend deltas are fractions (0.034 = +3.4 %). Formatting only. */
function formatSignedFraction(v: number): string {
  return `${v >= 0 ? "+" : "−"}${(Math.abs(v) * 100).toFixed(1)}%`;
}

function Delta({ value }: { value: number }) {
  return (
    <p className={`mt-3 text-xs font-bold ${value >= 0 ? "text-primary" : "text-alert"}`}>
      {formatSignedFraction(value)} <span className="font-medium text-muted">{K.vsPrev}</span>
    </p>
  );
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
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[124px] rounded-2xl" />)}
      </div>
    );
  }

  const aiHint =
    branchId === "all" && chain.data
      ? K.aiHintChain(chain.data.portfolio_impact.strategies_count, chain.data.portfolio_impact.stores_with_plan)
      : K.aiHint;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card>
        <p className="text-sm font-semibold text-muted">{K.averageTicket}</p>
        <p className="mt-2 text-[28px] font-extrabold leading-none tabular-nums">{formatMoneyExact(kpis.average_ticket)}</p>
        <Delta value={kpis.average_ticket_delta_pct} />
      </Card>
      <Card>
        <p className="text-sm font-semibold text-muted">{K.itemsPerTicket}</p>
        <p className="mt-2 text-[28px] font-extrabold leading-none tabular-nums">{formatDecimal(kpis.items_per_ticket)}</p>
        <Delta value={kpis.items_per_ticket_delta_pct} />
      </Card>
      <Card>
        <p className="text-sm font-semibold text-muted">{K.stockouts}</p>
        <p className="mt-2 text-[28px] font-extrabold leading-none tabular-nums text-alert">{formatNumber(kpis.stockout_products)}</p>
      </Card>
      <Card>
        <p className="text-sm font-semibold text-muted">{K.noDemand}</p>
        <p className="mt-2 text-[28px] font-extrabold leading-none tabular-nums text-info">{formatNumber(kpis.no_demand_products)}</p>
      </Card>
      <div className="rounded-2xl bg-sidebar p-5 text-white">
        <p className="text-sm font-semibold text-sidebar-text">{K.aiOpportunity}</p>
        <p className="mt-2 text-[28px] font-extrabold leading-none tabular-nums text-[#FFB070]">{formatMoney(kpis.ai_opportunity_mxn)}</p>
        <p className="mt-3 text-xs text-sidebar-text/80">{aiHint}</p>
      </div>
    </div>
  );
}
