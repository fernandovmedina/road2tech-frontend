"use client";

import { useTendency } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney } from "@/lib/format";
import { ConstraintsList } from "@/components/strategy/ConstraintsList";
import type { DiscountPoint, Strategy } from "@/types";

const H = copy.strategy.how;
const D = copy.product.how;

/**
 * "¿Cómo se calculó?": the folded place for everything technical (explanation, assumptions, rules, estimate range,
 * forecast warnings). The rest of the screen stays free of it.
 */
export function CalculationDetails({ strategy, point }: { strategy: Strategy; point: DiscountPoint }) {
  const tendency = useTendency(strategy.store_id, strategy.promoted_product_id).data;
  const range = point.confidence_interval;
  const risks = tendency?.risks ?? [];

  return (
    <details className="group rounded-2xl border border-line bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-primary">
        {H.toggle}
        <span aria-hidden className="text-lg transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-line px-5 py-4 text-sm">
        <section aria-label={D.explanation}>
          <p className="leading-relaxed">{strategy.explanation}</p>
          {tendency?.ai_summary && <p className="mt-2 leading-relaxed text-muted">{tendency.ai_summary}</p>}
        </section>

        <p className="rounded-[10px] bg-primary-tint px-3 py-2 font-semibold text-primary">
          {H.range(formatMoney(range.low), formatMoney(range.high))}
        </p>

        {strategy.assumptions.length > 0 && (
          <section aria-label={H.assumptions}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{H.assumptions}</h3>
            <ul className="mt-2 list-disc pl-5 text-muted">
              {strategy.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        <ConstraintsList constraints={strategy.constraints} rejected={strategy.status === "rejected"} />

        {risks.length > 0 && (
          <section aria-label={D.risksTitle}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{D.risksTitle}</h3>
            <ul className="mt-2 list-disc pl-5 text-muted">
              {risks.map((r) => (
                <li key={`${r.code}-${r.message}`}>{r.message}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-muted">{H.note}</p>
      </div>
    </details>
  );
}
