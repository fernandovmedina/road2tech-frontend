"use client";

import Link from "next/link";
import { useId } from "react";
import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { t } from "@/lib/labels";
import { productHref } from "@/lib/links";
import { Badge } from "@/components/ui/Badge";
import { HowCalculated } from "./HowCalculated";
import { MeasurementResult } from "./MeasurementResult";
import { StrategyActions } from "./StrategyActions";
import { isBlockedByConstraint, notRecommendedText, promoTitle, riskLevel, riskTone, signedUnits, statusTone } from "./strategyFormat";
import { useLiveStrategy } from "./useLiveStrategy";
import type { Strategy } from "@/types";

const P = copy.strategy.promo;

function Figure({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold leading-tight text-muted">{label}</dt>
      <dd className={`mt-1 text-xl font-extrabold leading-tight tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}

/**
 * One promotion of the plan, as a simple card: what is promoted (one line), three everyday figures, one main action.
 * The technical side (range, assumptions, limits, lifecycle) lives in the folded "¿Cómo se calculó?".
 */
export function StrategyCard({ strategy, showDetailLink = true }: { strategy: Strategy; showDetailLink?: boolean }) {
  const [current, update] = useLiveStrategy(strategy);
  const s = current ?? strategy;
  const headingId = useId();
  const { nameOf, byId } = useCatalog();
  const blocked = isBlockedByConstraint(s);
  const risk = riskLevel(s.treated.stockout_risk);
  const savesWaste = s.expected_waste_reduction > 0;

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="orange">{P.types[s.strategy_type]}</Badge>
          <Badge tone={statusTone[s.status]}>{t("strategyStatus", s.status)}</Badge>
        </div>
        <h3 id={headingId} className="line-clamp-2 text-base font-extrabold leading-snug">
          {promoTitle(s, nameOf, byId.has(s.promoted_product_id))}
        </h3>
      </header>

      {blocked ? (
        <p role="note" className="rounded-[10px] border border-alert/30 bg-alert-tint px-3 py-2.5 text-sm font-semibold text-alert-dark">
          {notRecommendedText(s)}
        </p>
      ) : (
        <dl className="grid grid-cols-3 items-start gap-3 rounded-xl bg-background p-3">
          <Figure label={P.gain} value={formatSignedMoney(s.expected_margin_increment)} valueClass="text-primary" />
          {savesWaste ? (
            <Figure label={P.waste} value={formatMoney(s.expected_waste_reduction)} />
          ) : (
            <Figure label={P.extraUnits} value={signedUnits(s.expected_units_increment)} />
          )}
          <Figure label={P.risk} value={P.riskLevels[risk]} valueClass={riskTone[risk]} />
        </dl>
      )}

      {s.status === "measured" && <MeasurementResult strategy={s} />}

      <div className="mt-auto flex flex-col gap-2">
        {showDetailLink && (
          <Link
            href={productHref(s.promoted_product_id, { storeId: s.store_id, strategyId: s.draft_id })}
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {P.viewAnalysis}
          </Link>
        )}
        {!blocked && <StrategyActions strategy={s} onChanged={update} showDetailLink={false} />}
      </div>

      <HowCalculated strategy={s} />
    </article>
  );
}
