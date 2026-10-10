"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useCatalog, useMeta, useRegeneratePlan, useStore, useStorePlan } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatDate, formatSignedMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Disclosure } from "./Disclosure";
import { StrategyCard } from "./StrategyCard";
import { formatTimestamp, isBlockedByConstraint, notRecommendedText, promoTitle } from "./strategyFormat";
import type { Plan, Strategy } from "@/types";

const P = copy.strategy.plan;
const DEFAULT_MAX_STRATEGIES = 5;
const TOP = 3;
const cardGrid = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";

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

/** Recommended = still alive and within the business limits. Only these compete for the top three. */
const isRecommended = (s: Strategy) => s.status !== "rejected" && s.status !== "expired" && !isBlockedByConstraint(s);

function PlanSkeleton() {
  return (
    <div role="status" aria-label={copy.common.loading} className="flex flex-col gap-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className={cardGrid}>
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="hidden h-72 rounded-2xl xl:block" />
      </div>
    </div>
  );
}

function Conflicts({ plan }: { plan: Plan }) {
  const { conflicts } = plan.portfolio;
  if (conflicts.length === 0) return null;
  const titleOf = (id: string) => plan.strategies.find((s) => s.draft_id === id)?.title;
  return (
    <Disclosure
      label={P.conflicts.summary(conflicts.length)}
      className="rounded-[10px] border border-[#E8C26A] bg-[#FFF4D6] px-4 py-0.5"
      buttonClassName="text-[#6B4500]"
    >
      <ul className="flex flex-col gap-3 pb-3 text-sm text-[#6B4500]">
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
    </Disclosure>
  );
}

/** Promotions the engine could not recommend, each with one plain sentence on why. No gain figures. */
function Discarded({ strategies }: { strategies: Strategy[] }) {
  const { nameOf, byId } = useCatalog();
  if (strategies.length === 0) return null;
  return (
    <Disclosure label={P.discarded(strategies.length)} className="rounded-2xl border border-line bg-white px-4 py-0.5">
      <ul className="flex flex-col divide-y divide-line pb-2">
        {strategies.map((s) => (
          <li key={s.draft_id} className="py-2.5">
            <p className="line-clamp-2 text-sm font-bold">{promoTitle(s, nameOf, byId.has(s.promoted_product_id))}</p>
            <p className="text-sm text-alert-dark">{notRecommendedText(s)}</p>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}

/** "Promociones para reducir pérdidas y aumentar utilidades": the best three promotions of the period, the rest on demand. */
export function PlanPanel({ storeId }: { storeId: string }) {
  const plan = useStorePlan(storeId);
  const regenerate = useRegeneratePlan();
  const meta = useMeta();
  const store = useStore(storeId);
  const mutating = useIsMutating() > 0;
  const [showOthers, setShowOthers] = useState(false);

  if (plan.isError) return <ErrorState onRetry={() => void plan.refetch()} />;
  if (plan.isPending) return <PlanSkeleton />;

  const data = plan.data;
  const max = meta.data?.max_strategies_per_plan ?? DEFAULT_MAX_STRATEGIES;
  // Presentation order only: highest expected gain first (the figures themselves come from the backend).
  const recommended = data.strategies
    .filter(isRecommended)
    .sort((a, b) => b.expected_margin_increment - a.expected_margin_increment)
    .slice(0, max);
  const discarded = data.strategies.filter((s) => !isRecommended(s));
  const top = recommended.slice(0, TOP);
  const others = recommended.slice(TOP);
  const recalculating = mutating || plan.isFetching;
  const regenerating = regenerate.isPending;
  const from = formatDate(data.period.from);
  const to = formatDate(data.period.to);
  const subtitle = store ? P.subtitle(displayBranchName(store), from, to) : P.subtitleNoStore(from, to);
  const regenerateButton = (
    <Button variant="secondary" onClick={() => regenerate.mutate(storeId)} disabled={regenerating}>
      {regenerating ? P.regenerating : P.regenerate}
    </Button>
  );

  return (
    <section aria-labelledby="plan-title" aria-busy={recalculating} className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-xl">
          <h2 id="plan-title" className="text-lg font-extrabold leading-snug">{P.title}</h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <p className="text-xs text-muted">{P.generatedAt(formatTimestamp(data.generated_at))}</p>
        </div>

        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div className="min-w-48" aria-live="polite">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted">
              {P.portfolioLabel}
              <Badge tone="gray">{P.estimated}</Badge>
            </p>
            {recalculating ? (
              <>
                <Skeleton className="mt-1 h-8 w-40" />
                <p className="mt-1 text-xs text-muted">{P.recalculating}</p>
              </>
            ) : (
              <p className="text-2xl font-extrabold tabular-nums text-primary">≈ {formatSignedMoney(data.portfolio.net_expected_margin_increment)}</p>
            )}
            <Disclosure label={copy.strategy.how.toggle} className="max-w-72">
              <p className="text-xs leading-relaxed text-muted">{P.portfolioHow}</p>
            </Disclosure>
          </div>

          <div className="flex flex-col items-start gap-1">
            {regenerateButton}
            {regenerate.isError && (
              <p role="alert" className="max-w-56 text-xs font-medium text-alert-dark">{P.regenerateError}</p>
            )}
          </div>
        </div>
      </Card>

      {recommended.length > 0 && recommended.length < max && (
        <p role="status" className="rounded-[10px] border border-[#E8C26A] bg-[#FFF4D6] px-4 py-3 text-sm text-[#6B4500]">
          <span className="font-bold">{P.fewer(recommended.length)} </span>
          {reasonText(data.reason_if_fewer)}
        </p>
      )}

      <Conflicts plan={data} />

      {regenerating ? (
        <PlanSkeleton />
      ) : top.length === 0 ? (
        <EmptyState title={P.emptyTitle} text={reasonText(data.reason_if_fewer)} action={regenerateButton} />
      ) : (
        <>
          <ol className={cardGrid}>
            {top.map((s) => (
              <li key={s.draft_id} className="[&>article]:h-full">
                <StrategyCard strategy={s} />
              </li>
            ))}
          </ol>

          {others.length > 0 && (
            <>
              <div>
                <Button
                  variant="secondary"
                  aria-expanded={showOthers}
                  aria-controls="plan-others"
                  onClick={() => setShowOthers((v) => !v)}
                >
                  {showOthers ? P.hideOthers : P.showOthers(others.length)}
                </Button>
              </div>
              {showOthers && (
                <ol id="plan-others" className={cardGrid}>
                  {others.map((s) => (
                    <li key={s.draft_id} className="[&>article]:h-full">
                      <StrategyCard strategy={s} />
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </>
      )}

      <Discarded strategies={discarded} />
    </section>
  );
}
