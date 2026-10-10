"use client";

import { useChainSummary, type Scope } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";

const R = copy.dashboard.ranking;

/** Stores with the largest opportunity, as ranked by the backend (chain view only). */
export function StoreRanking({
  scope,
  storeIdsInZone,
  onSelect,
}: {
  scope: Pick<Scope, "mode" | "range">;
  /** When a zone filter is active: the stores that belong to it. `null` = no zone filter. */
  storeIdsInZone: Set<string> | null;
  onSelect: (storeId: string) => void;
}) {
  const { data, isPending, isError, refetch } = useChainSummary(scope);
  const rows = (data?.store_ranking ?? []).filter((r) => !storeIdsInZone || storeIdsInZone.has(r.store_id));

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-extrabold">{R.title}</h3>
        <p className="text-xs text-muted">{R.subtitle}</p>
      </div>
      <div className="flex max-h-[430px] flex-col gap-2 overflow-y-auto pr-1">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[60px]" />)
        ) : rows.length === 0 ? (
          <EmptyState text={R.noZoneRows} />
        ) : (
          rows.map((r, i) => {
            const name = displayBranchName(r);
            return (
              <button
                key={r.store_id}
                type="button"
                aria-label={R.selectBranch(name)}
                onClick={() => onSelect(r.store_id)}
                className="flex min-h-[60px] items-center gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:border-primary hover:bg-primary-tint/50"
              >
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background text-xs font-extrabold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{name}</span>
                  <span className="block truncate text-xs text-muted">{t("zone", r.zone_type)} · {R.strategies(r.strategies_count)}</span>
                </span>
                <span className="text-sm font-extrabold tabular-nums text-primary">+{formatMoney(r.opportunity_mxn)}</span>
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
