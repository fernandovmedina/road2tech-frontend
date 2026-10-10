import { copy } from "@/lib/copy";
import { formatMoney } from "@/lib/format";
import { ConstraintsList } from "./ConstraintsList";
import { Disclosure } from "./Disclosure";
import { StatusTimeline } from "./StatusTimeline";
import { isBlockedByConstraint } from "./strategyFormat";
import type { Strategy } from "@/types";

const H = copy.strategy.how;

/** Folded "¿Cómo se calculó?": the technical side of a promotion (why, range, assumptions, limits, status). */
export function HowCalculated({ strategy: s }: { strategy: Strategy }) {
  const blocked = isBlockedByConstraint(s);
  return (
    <Disclosure label={H.toggle} className="border-t border-line pt-1">
      <div className="flex flex-col gap-4 pb-1 text-sm">
        <p className="leading-relaxed">{s.explanation}</p>
        {!blocked && (
          <p className="font-semibold">{H.range(formatMoney(s.confidence_interval.low), formatMoney(s.confidence_interval.high))}</p>
        )}
        {s.assumptions.length > 0 && (
          <section aria-label={H.assumptions}>
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted">{H.assumptions}</h4>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {s.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}
        <ConstraintsList constraints={s.constraints} rejected={s.status === "rejected"} />
        <section aria-label={H.status} className="flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted">{H.status}</h4>
          <StatusTimeline status={s.status} />
        </section>
        <p className="text-xs text-muted">{H.note}</p>
      </div>
    </Disclosure>
  );
}
