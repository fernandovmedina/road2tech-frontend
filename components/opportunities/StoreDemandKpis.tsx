import { AlertTriangle, Boxes, TrendingUp, Warehouse } from "lucide-react";
import { Kpi } from "@/components/ui/Kpi";
import { copy } from "@/lib/copy";
import type { OpportunityMapSummary } from "@/lib/api/opportunityMap";
import { formatInteger, formatSignedPercent } from "@/lib/format";

export function StoreDemandKpis({ summary }: { summary: OpportunityMapSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi
        label={copy.opportunities.kpis.forecastDemand}
        value={copy.opportunities.unitsPerDay(formatInteger(summary.totalDemand))}
        caption={copy.opportunities.kpis.forecastDemandCaption}
        icon={TrendingUp}
        tone="primary"
      />
      <Kpi
        label={copy.opportunities.kpis.averageUplift}
        value={formatSignedPercent(summary.averageUplift)}
        caption={copy.opportunities.kpis.averageUpliftCaption}
        icon={Warehouse}
        tone="warning"
      />
      <Kpi
        label={copy.opportunities.kpis.branchesToWatch}
        value={String(summary.atRiskBranches)}
        caption={copy.opportunities.kpis.branchesToWatchCaption}
        icon={AlertTriangle}
        tone="alert"
      />
      <Kpi
        label={copy.opportunities.kpis.suggestedExtraStock}
        value={copy.opportunities.units(formatInteger(summary.extraUnits))}
        caption={copy.opportunities.kpis.suggestedExtraStockCaption}
        icon={Boxes}
        tone="primary"
      />
    </div>
  );
}
