"use client";

import Link from "next/link";
import { useCatalog, useStorePlan } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatSignedMoney } from "@/lib/format";
import { productHref } from "@/lib/links";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { isBlockedByConstraint, promoTitle } from "@/components/strategy/strategyFormat";

const A = copy.dashboard.analysis;

/** Compact list of the store's recommended promotions (same strategies as the plan section, no long texts). */
export function PromotionsPanel({ storeId }: { storeId: string }) {
  const { data, isPending, isError, refetch } = useStorePlan(storeId);
  const { nameOf, byId } = useCatalog();
  const strategies = (data?.strategies ?? [])
    .filter((s) => s.status !== "rejected" && s.status !== "expired" && !isBlockedByConstraint(s))
    .sort((a, b) => b.expected_margin_increment - a.expected_margin_increment);

  return (
    <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isPending ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)
      ) : strategies.length === 0 ? (
        <EmptyState text={A.noPromos} />
      ) : (
        <ul className="flex flex-col gap-2">
          {strategies.map((s) => (
            <li key={s.draft_id}>
              <Link
                href={productHref(s.promoted_product_id, { storeId, strategyId: s.draft_id })}
                className="flex min-h-11 flex-col gap-0.5 rounded-block bg-background p-3 transition-colors hover:bg-primary-tint/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="line-clamp-2 text-sm font-bold leading-snug">{promoTitle(s, nameOf, byId.has(s.promoted_product_id))}</span>
                <span className="text-sm text-muted">
                  {copy.strategy.promo.gain}{" "}
                  <span className="font-bold tabular-nums text-primary">{formatSignedMoney(s.expected_margin_increment)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
