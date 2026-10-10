"use client";

import { useId, type ReactNode } from "react";
import { useCatalog, useStore } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatDate, formatMoney, formatPct, formatSignedMoney } from "@/lib/format";
import { t } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { ConstraintsList } from "./ConstraintsList";
import { MeasurementResult } from "./MeasurementResult";
import { StatusTimeline } from "./StatusTimeline";
import { StrategyActions } from "./StrategyActions";
import { discountLabel, intervalText, signedUnits, statusTone } from "./strategyFormat";
import { useLiveStrategy } from "./useLiveStrategy";
import type { Strategy } from "@/types";

const S = copy.strategy;

function Metric({ label, value, hint, emphasis = false }: { label: string; value: string; hint?: ReactNode; emphasis?: boolean }) {
  return (
    <div className={`rounded-[10px] p-3 ${emphasis ? "bg-primary-tint" : "bg-background"}`}>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={`mt-0.5 text-lg font-extrabold tabular-nums ${emphasis ? "text-primary" : ""}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

/**
 * One strategy of the commercial plan: what is proposed, what it is expected to do (always as an estimate with its
 * range), why, which limits were considered, where it is in its lifecycle and what the user can do next.
 */
export function StrategyCard({
  strategy,
  showDetailLink = true,
  readOnlyNote,
}: {
  strategy: Strategy;
  showDetailLink?: boolean;
  /** Replaces the actions with this note (the strategy cannot be acted on from here). */
  readOnlyNote?: string;
}) {
  const [current, update] = useLiveStrategy(strategy);
  const s = current ?? strategy;
  const headingId = useId();
  const { nameOf } = useCatalog();
  const store = useStore(s.store_id);

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="orange">{t("strategyType", s.strategy_type)}</Badge>
          <Badge tone={statusTone[s.status]}>{t("strategyStatus", s.status)}</Badge>
        </div>
        <h3 id={headingId} className="text-base font-extrabold leading-snug">{s.title}</h3>
        <dl className="flex flex-col gap-1 text-sm text-muted">
          {s.anchor_product_id && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">{S.products.anchor}</dt>
              <dd className="text-foreground">{nameOf(s.anchor_product_id)}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold">{s.anchor_product_id ? S.products.promoted : S.products.single}</dt>
            <dd className="text-foreground">{nameOf(s.promoted_product_id)}</dd>
          </div>
          {store && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">{copy.common.branch}</dt>
              <dd className="text-foreground">{displayBranchName(store)}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold">{S.validity}</dt>
            <dd className="text-foreground">{formatDate(s.period.start_date)} – {formatDate(s.period.end_date)}</dd>
          </div>
        </dl>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label={S.metrics.discount} value={discountLabel(s.proposed_discount_pct)} />
        <Metric label={S.metrics.units} value={signedUnits(s.expected_units_increment)} />
        <Metric label={S.metrics.revenue} value={formatSignedMoney(s.expected_sales_increment)} />
        <Metric
          label={S.metrics.margin}
          value={`≈ ${formatSignedMoney(s.expected_margin_increment)}`}
          hint={intervalText(s.confidence_interval)}
          emphasis
        />
        <Metric label={S.metrics.waste} value={formatMoney(s.expected_waste_reduction)} />
        <Metric
          label={S.metrics.stockoutRisk}
          value={formatPct(s.treated.stockout_risk)}
          hint={S.baselineRisk(formatPct(s.baseline.stockout_risk))}
        />
      </dl>
      <p className="-mt-2 text-xs text-muted">{S.estimateNote}</p>

      <p className="text-sm leading-relaxed">{s.explanation}</p>

      <ConstraintsList constraints={s.constraints} rejected={s.status === "rejected"} />

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <StatusTimeline status={s.status} />
        {s.status === "measured" && <MeasurementResult strategy={s} />}
        {readOnlyNote ? (
          <p className="text-xs text-muted">{readOnlyNote}</p>
        ) : (
          <StrategyActions strategy={s} onChanged={update} showDetailLink={showDetailLink} />
        )}
      </div>
    </article>
  );
}
