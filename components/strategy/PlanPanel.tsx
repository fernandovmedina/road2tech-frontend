"use client";

import { useIsMutating } from "@tanstack/react-query";
import { useMeta, useRegeneratePlan, useStore, useStorePlan } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatDate, formatSignedMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { StrategyCard } from "./StrategyCard";
import { formatTimestamp, intervalText } from "./strategyFormat";
import type { Plan } from "@/types";

const P = copy.strategy.plan;
const DEFAULT_MAX_STRATEGIES = 5;

const looksLikeCode = (v: string) => /^[a-z0-9_]+$/.test(v);

/** The backend sends either a stable code or a sentence; codes are translated, sentences are shown as they come. */
function reasonText(reason: string | null): string {
  if (!reason) return P.reasons.fallback;
  const known: Record<string, string> = P.reasons.codes;
  if (known[reason]) return known[reason];
  const filtered = /^constraints_filtered_(\d+)$/.exec(reason);
  if (filtered) return P.reasons.filtered(Number(filtered[1]));
  return looksLikeCode(reason) ? P.reasons.fallback : reason;
}

function lookup(map: Record<string, string>, code: string): string | null {
  return map[code] ?? (looksLikeCode(code) ? null : code);
}

function PlanSkeleton() {
  return (
    <div role="status" aria-label={copy.common.loading} className="flex flex-col gap-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

function Conflicts({ plan }: { plan: Plan }) {
  const { conflicts } = plan.portfolio;
  if (conflicts.length === 0) return null;
  const titleOf = (id: string) => plan.strategies.find((s) => s.draft_id === id)?.title;
  return (
    <section aria-label={P.conflicts.title} className="rounded-2xl border border-[#E8C26A] bg-[#FFF4D6] p-4 text-sm text-[#6B4500]">
      <h3 className="font-extrabold">{P.conflicts.title}</h3>
      <ul className="mt-2 flex flex-col gap-3">
        {conflicts.map((c) => {
          const kind = lookup(P.conflicts.types, c.type);
          const resolution = lookup(P.conflicts.resolutions, c.resolution);
          const names = c.strategy_ids.map(titleOf).filter((n): n is string => !!n);
          return (
            <li key={`${c.type}-${c.strategy_ids.join("-")}`}>
              {kind && <p className="font-bold">{kind}</p>}
              <p>{c.description}</p>
              {names.length > 0 && <p className="text-xs">{P.conflicts.between(names.join(" · "))}</p>}
              {resolution && <p className="text-xs font-semibold">{P.conflicts.resolution(resolution)}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Commercial plan of one store: portfolio impact (from the backend), up to five strategies, notices and regeneration. */
export function PlanPanel({ storeId }: { storeId: string }) {
  const plan = useStorePlan(storeId);
  const regenerate = useRegeneratePlan();
  const meta = useMeta();
  const store = useStore(storeId);
  const mutating = useIsMutating() > 0;

  if (plan.isError) return <ErrorState onRetry={() => void plan.refetch()} />;
  if (plan.isPending) return <PlanSkeleton />;

  const data = plan.data;
  const max = meta.data?.max_strategies_per_plan ?? DEFAULT_MAX_STRATEGIES;
  const strategies = data.strategies.slice(0, max);
  const recalculating = mutating || plan.isFetching;
  const regenerating = regenerate.isPending;
  const storeName = store ? displayBranchName(store) : null;
  const regenerateButton = (
    <Button variant="secondary" onClick={() => regenerate.mutate(storeId)} disabled={regenerating}>
      {regenerating ? P.regenerating : P.regenerate}
    </Button>
  );

  return (
    <section aria-labelledby="plan-title" aria-busy={recalculating} className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h2 id="plan-title" className="text-lg font-extrabold">{P.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {storeName ? `${storeName} · ` : ""}
            {formatDate(data.period.from)} – {formatDate(data.period.to)}
          </p>
          <p className="text-xs text-muted">{P.generatedAt(formatTimestamp(data.generated_at))}</p>
        </div>

        <div className="min-w-48" aria-live="polite">
          <p className="text-xs font-semibold text-muted">{P.portfolioLabel}</p>
          {recalculating ? (
            <>
              <Skeleton className="mt-1 h-8 w-40" />
              <p className="mt-1 text-xs text-muted">{P.recalculating}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold tabular-nums text-primary">
                ≈ {formatSignedMoney(data.portfolio.net_expected_margin_increment)}
              </p>
              <p className="text-xs text-muted">{intervalText(data.portfolio.confidence_interval)}</p>
              <p className="mt-0.5 max-w-64 text-xs text-muted">{P.portfolioHint}</p>
            </>
          )}
        </div>

        <div className="flex flex-col items-start gap-1">
          {regenerateButton}
          {regenerate.isError && (
            <p role="alert" className="max-w-56 text-xs font-medium text-alert-dark">{P.regenerateError}</p>
          )}
        </div>
      </Card>

      {data.strategies.length > 0 && data.strategies.length < max && (
        <p role="status" className="rounded-[10px] border border-[#E8C26A] bg-[#FFF4D6] px-4 py-3 text-sm text-[#6B4500]">
          <span className="font-bold">{P.fewer(data.strategies.length, max)} </span>
          {reasonText(data.reason_if_fewer)}
        </p>
      )}

      <Conflicts plan={data} />

      {regenerating ? (
        <PlanSkeleton />
      ) : strategies.length === 0 ? (
        <EmptyState title={P.emptyTitle} text={reasonText(data.reason_if_fewer)} action={regenerateButton} />
      ) : (
        <ol className="grid gap-4 xl:grid-cols-2">
          {strategies.map((s) => (
            <li key={s.draft_id} className="[&>article]:h-full">
              <StrategyCard strategy={s} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
