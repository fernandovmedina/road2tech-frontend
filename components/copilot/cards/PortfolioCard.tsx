import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatRange, formatSignedMoney } from "@/lib/copilot/format";
import type { Portfolio } from "@/types/copilot";

import { CardShell } from "../ui/CardShell";
import { StrategyCard } from "./StrategyCard";

const P = copy.copilot.portfolio;

export function PortfolioCard({ data }: { data: Portfolio }) {
  const leftOut = data.conflicts.length + data.skipped.length;
  return (
    <CardShell
      eyebrow={P.eyebrow}
      title={P.title(data.strategies.length, displayBranchName(data.store))}
      subtitle={P.subtitle(formatRange(data.period_from, data.period_to), formatSignedMoney(data.net_expected_impact))}
      footer={P.footer}
    >
      {data.strategies.length === 0 ? (
        <p className="text-sm text-muted">{P.empty}</p>
      ) : (
        <div className="space-y-2">
          {data.strategies.map((strategy) => (
            <StrategyCard key={strategy.draft_id ?? strategy.product.product_id} data={strategy} compact />
          ))}
        </div>
      )}
      {leftOut > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-primary">{P.leftOut(leftOut)}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {[...data.conflicts, ...data.skipped].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </CardShell>
  );
}
