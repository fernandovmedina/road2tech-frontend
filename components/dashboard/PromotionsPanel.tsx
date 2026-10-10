"use client";

import Link from "next/link";
import { useStorePlan } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/labels";
import { calendarHref, productHref } from "@/lib/links";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";

const A = copy.dashboard.analysis;
const smallBtn = "inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-sm font-semibold transition-colors";

/** Strategies of the selected store's plan, as the backend returns them (no client-side ranking or math). */
export function PromotionsPanel({ storeId }: { storeId: string }) {
  const { data, isPending, isError, refetch } = useStorePlan(storeId);
  const strategies = (data?.strategies ?? []).filter((s) => s.status !== "rejected");

  return (
    <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isPending ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-[96px]" />)
      ) : strategies.length === 0 ? (
        <EmptyState text={data?.reason_if_fewer ?? A.noPromos} />
      ) : (
        strategies.map((s) => (
          <div key={s.draft_id} className="rounded-xl border border-line p-3">
            <p className="text-sm font-bold leading-snug">{s.title}</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="flex flex-wrap items-center gap-1.5">
                {t("strategyType", s.strategy_type)}
                <Badge tone={s.status === "approved" || s.status === "scheduled" || s.status === "active" ? "green" : "gray"}>{t("strategyStatus", s.status)}</Badge>
              </span>
              <span className="text-sm font-extrabold tabular-nums text-primary">{A.gain} +{formatMoney(s.expected_margin_increment)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={productHref(s.promoted_product_id, { storeId, strategyId: s.draft_id })}
                className={`${smallBtn} bg-primary-tint text-primary hover:bg-primary/15`}
              >
                {A.viewDetail}
              </Link>
              <Link
                href={calendarHref({ productId: s.promoted_product_id, storeId, date: s.period.start_date })}
                className={`${smallBtn} border border-line hover:bg-background`}
              >
                {copy.common.viewInCalendar}
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
