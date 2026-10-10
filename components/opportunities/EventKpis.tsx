import { StatTile } from "@/components/ui/StatTile";
import { formatCompact, formatInteger, formatMxnCompact } from "@/lib/format";
import type { EventPrediction } from "@/types/eventPrediction";

type EventKpisProps = {
  predictions: readonly EventPrediction[];
  totalBranches: number;
  scopeLabel: string;
};

export function EventKpis({ predictions, totalBranches, scopeLabel }: EventKpisProps) {
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
      <StatTile
        label="Opportunity points"
        value={formatInteger(predictions.length)}
        caption={scopeLabel}
      />
      <StatTile
        label="Expected extra sales"
        value={formatMxnCompact(extraSales)}
        caption="Caused by these events"
      />
      <StatTile
        label="Extra stock recommended"
        value={`${formatCompact(extraUnits)} units`}
        caption="Includes a 10% safety buffer"
      />
      <StatTile
        label="Branches affected"
        value={`${branchesAffected} of ${totalBranches}`}
        caption="Inside at least one influence radius"
      />
    </div>
  );
}
