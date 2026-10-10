import { copy } from "@/lib/copy";
import { formatMoney, formatPct } from "@/lib/format";
import type { Strategy } from "@/types";

const C = copy.strategy.constraints;

/** Business limits the engine considered, and the ones it could not meet (a rejected strategy explains why). */
export function ConstraintsList({ constraints, rejected = false }: { constraints: Strategy["constraints"]; rejected?: boolean }) {
  const limits: string[] = [];
  if (constraints.min_margin_pct !== null) limits.push(C.minMargin(formatPct(constraints.min_margin_pct)));
  if (constraints.max_discount_pct !== null) limits.push(C.maxDiscount(formatPct(constraints.max_discount_pct)));
  if (constraints.budget_mxn !== null) limits.push(C.budget(formatMoney(constraints.budget_mxn)));
  const violated = constraints.violations.length > 0 || !constraints.satisfied;

  return (
    <section aria-label={C.title} className="flex flex-col gap-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted">{C.title}</h4>
      {limits.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {limits.map((l) => (
            <li key={l} className="rounded-full bg-[#EEF1F0] px-2.5 py-1 text-xs font-semibold text-foreground">{l}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">{C.none}</p>
      )}
      {violated ? (
        <div role="alert" className="rounded-[10px] border border-alert/30 bg-alert-tint p-3 text-sm text-alert-dark">
          <p className="font-bold">{rejected ? C.rejectedTitle : C.violatedTitle}</p>
          {constraints.violations.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {constraints.violations.map((v) => (
                <li key={`${v.code}-${v.message}`}>{v.message}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs font-semibold text-primary">✓ {C.satisfied}</p>
      )}
    </section>
  );
}
