import { StatTile } from "@/components/ui/StatTile";
import { formatSignedPercent } from "@/lib/format";
import { WEEKDAY_LABELS } from "@/lib/opportunities/labels";
import type { BaselineRow } from "@/lib/opportunities/predictionInsights";
import type { Weekday } from "@/types/weekday";

type NormalDayKpisProps = {
  weekday: Weekday;
  rows: readonly BaselineRow[];
  totalBranches: number;
};

export function NormalDayKpis({ weekday, rows, totalBranches }: NormalDayKpisProps) {
  const strongest = rows.reduce<BaselineRow | null>(
    (best, row) => (!best || row.changePct > best.changePct ? row : best),
    null,
  );
  const weakest = rows.reduce<BaselineRow | null>(
    (worst, row) => (!worst || row.changePct < worst.changePct ? row : worst),
    null,
  );

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Scenario"
        value={`Normal ${WEEKDAY_LABELS[weekday]}`}
        caption="No events applied"
      />
      <StatTile
        label="Branches monitored"
        value={String(totalBranches)}
        caption="Saltillo metro area"
      />
      <StatTile
        label="Strongest normal-day lift"
        value={strongest ? formatSignedPercent(strongest.changePct) : "—"}
        caption={strongest ? `${strongest.productName} vs. an average day` : undefined}
      />
      <StatTile
        label="Biggest normal-day dip"
        value={weakest ? formatSignedPercent(weakest.changePct) : "—"}
        caption={weakest ? `${weakest.productName} vs. an average day` : undefined}
      />
    </div>
  );
}
