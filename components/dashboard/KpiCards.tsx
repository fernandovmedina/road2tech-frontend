"use client";

import { useKpis, type Scope } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney, formatNumber, formatSignedPct } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";

const K = copy.dashboard.kpi;

export function KpiCards({ scope }: { scope: Scope }) {
  const { data, isPending, isError, refetch } = useKpis(scope);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[124px] rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <p className="text-sm font-semibold text-muted">{K.averageTicket}</p>
        <p className="mt-2 text-[32px] font-extrabold leading-none">{formatMoney(data.averageTicket)}</p>
        <p className="mt-3 text-xs font-bold text-primary">
          {formatSignedPct(data.averageTicketDeltaPct)} <span className="font-medium text-muted">{K.vsPrev}</span>
        </p>
      </Card>
      <Card>
        <p className="text-sm font-semibold text-muted">{K.stockouts}</p>
        <p className="mt-2 text-[32px] font-extrabold leading-none text-alert">{formatNumber(data.stockouts)}</p>
        <div className="mt-3 h-1.5 rounded-full bg-alert-tint"><div className="h-full rounded-full bg-alert" style={{ width: `${Math.min(100, data.stockouts * 12)}%` }} /></div>
      </Card>
      <Card>
        <p className="text-sm font-semibold text-muted">{K.noDemand}</p>
        <p className="mt-2 text-[32px] font-extrabold leading-none text-info">{formatNumber(data.noDemand)}</p>
        <div className="mt-3 h-1.5 rounded-full bg-info-tint"><div className="h-full rounded-full bg-info" style={{ width: `${Math.min(100, data.noDemand * 12)}%` }} /></div>
      </Card>
      <div className="rounded-2xl bg-sidebar p-5 text-white">
        <p className="text-sm font-semibold text-sidebar-text">{K.aiOpportunity}</p>
        <p className="mt-2 text-[32px] font-extrabold leading-none text-[#FFB070]">{formatMoney(data.aiOpportunity)}</p>
        <p className="mt-3 text-xs text-sidebar-text/80">{K.aiHint}</p>
      </div>
    </div>
  );
}
