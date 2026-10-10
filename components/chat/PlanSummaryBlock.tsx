import { copy } from "@/lib/copy";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { BlockOf } from "./chatTypes";

const C = copy.chat.plan;

/** Current plan vs. plan with the draft. Every figure comes from the backend; nothing is computed here. */
export function PlanSummaryBlock({ block }: { block: BlockOf<"plan_summary"> }) {
  return (
    <section aria-label={C.title} className="w-full max-w-3xl rounded-2xl border border-line bg-white p-4">
      <h3 className="text-sm font-bold">{C.title}</h3>
      <p className="text-xs text-muted">{C.hint}</p>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-background p-3">
          <dt className="text-xs font-semibold text-muted">{C.current}</dt>
          <dd className="text-lg font-extrabold">{formatMoney(block.current_net_expected_margin_increment)}</dd>
        </div>
        <div className="rounded-xl bg-background p-3">
          <dt className="text-xs font-semibold text-muted">{C.withDraft}</dt>
          <dd className="text-lg font-extrabold">{formatMoney(block.with_draft_net_expected_margin_increment)}</dd>
        </div>
        <div className={`rounded-xl p-3 ${block.delta >= 0 ? "bg-primary-tint" : "bg-alert-tint"}`}>
          <dt className="text-xs font-semibold text-muted">{C.delta}</dt>
          <dd className={`text-lg font-extrabold ${block.delta >= 0 ? "text-primary" : "text-alert-dark"}`}>
            {formatSignedMoney(block.delta)}
          </dd>
        </div>
      </dl>
      <div className="mt-3">
        {block.overlaps.length === 0 ? (
          <p className="text-xs text-muted">{C.noOverlaps}</p>
        ) : (
          <>
            <p className="mb-1 text-xs font-semibold text-muted">{C.overlaps}</p>
            <ul className="flex flex-wrap gap-1.5">
              {block.overlaps.map((o, i) => (
                <li key={`${o}-${i}`}>
                  <Badge tone="amber" className="whitespace-normal break-words">{o}</Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
