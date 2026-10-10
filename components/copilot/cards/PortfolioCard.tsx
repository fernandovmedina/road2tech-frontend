import { formatRange, formatSignedMoney } from "@/lib/copilot/format";
import type { Portfolio } from "@/types/copilot";

import { CardShell } from "../ui/CardShell";
import { StrategyCard } from "./StrategyCard";

export function PortfolioCard({ data }: { data: Portfolio }) {
  return (
    <CardShell
      eyebrow="Commercial plan"
      title={`${data.strategies.length} strategies for ${data.store.store_name}`}
      subtitle={`${formatRange(data.period_from, data.period_to)} · total expected net impact ${formatSignedMoney(data.net_expected_impact)}`}
      footer="Strategies never share a product, so the plan total is the sum of the cards (no double counting). All are drafts until approved."
    >
      {data.strategies.length === 0 ? (
        <p className="text-sm text-sc-ink-secondary">No strategy passed the business rules for this period.</p>
      ) : (
        <div className="space-y-2">
          {data.strategies.map((strategy) => (
            <StrategyCard key={strategy.draft_id ?? strategy.product.product_id} data={strategy} compact />
          ))}
        </div>
      )}
      {data.conflicts.length + data.skipped.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-sc-accent">
            Left out of the plan ({data.conflicts.length + data.skipped.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sc-ink-secondary">
            {[...data.conflicts, ...data.skipped].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </CardShell>
  );
}
