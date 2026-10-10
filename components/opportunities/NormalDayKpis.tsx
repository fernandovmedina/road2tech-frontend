import { Kpi } from "@/components/ui/Kpi";
import { copy } from "@/lib/copy";
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
      <Kpi
        label={copy.opportunities.normalDayKpis.scenario}
        value={copy.opportunities.normalDayKpis.scenarioValue(WEEKDAY_LABELS[weekday])}
        caption={copy.opportunities.normalDayKpis.scenarioCaption}
      />
      <Kpi
        label={copy.opportunities.normalDayKpis.branchesMonitored}
        value={String(totalBranches)}
        caption={copy.opportunities.normalDayKpis.branchesCaption}
      />
      <Kpi
        label={copy.opportunities.normalDayKpis.strongestLift}
        value={strongest ? formatSignedPercent(strongest.changePct) : "—"}
        caption={strongest ? copy.opportunities.normalDayKpis.versusAverage(strongest.productName) : undefined}
      />
      <Kpi
        label={copy.opportunities.normalDayKpis.biggestDip}
        value={weakest ? formatSignedPercent(weakest.changePct) : "—"}
        caption={weakest ? copy.opportunities.normalDayKpis.versusAverage(weakest.productName) : undefined}
      />
    </div>
  );
}
