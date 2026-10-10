import { Kpi } from "@/components/ui/Kpi";
import { copy } from "@/lib/copy";
import { formatCompact, formatInteger, formatMxnCompact } from "@/lib/format";
import type { EventPrediction } from "@/types/eventPrediction";

type EventKpisProps = {
  predictions: readonly EventPrediction[];
  totalBranches: number;
  scopeLabel: string;
};

export function EventKpis({ predictions, totalBranches, scopeLabel }: EventKpisProps) {
  // TODO(backend): these aggregates should come pre-computed from the events endpoint.
  const extraSales = predictions.reduce((total, p) => total + p.expectedExtraSalesMxn, 0);
  const extraUnits = predictions.reduce(
    (total, p) =>
      total + p.productImpacts.reduce((sum, impact) => sum + impact.recommendedExtraUnits, 0),
    0,
  );
  const branchesAffected = new Set(
    predictions.flatMap((p) => p.affectedBranches.map((branch) => branch.branchId)),
  ).size;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        label={copy.opportunities.eventKpis.points}
        value={formatInteger(predictions.length)}
        caption={scopeLabel}
      />
      <Kpi
        label={copy.opportunities.eventKpis.extraSales}
        value={formatMxnCompact(extraSales)}
        caption={copy.opportunities.eventKpis.extraSalesCaption}
      />
      <Kpi
        label={copy.opportunities.eventKpis.extraStock}
        value={`${formatCompact(extraUnits)} u`}
        caption={copy.opportunities.eventKpis.extraStockCaption}
      />
      <Kpi
        label={copy.opportunities.eventKpis.branches}
        value={copy.opportunities.eventKpis.ofTotal(branchesAffected, totalBranches)}
        caption={copy.opportunities.eventKpis.branchesCaption}
      />
    </div>
  );
}
