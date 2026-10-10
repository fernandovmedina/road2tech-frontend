import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatInteger, formatLongDate, formatPct, formatUnits } from "@/lib/copilot/format";
import { t } from "@/lib/labels";
import type { DemandByStore } from "@/types/copilot";

import { BranchDemandChart } from "../charts/BranchDemandChart";
import { CardShell } from "../ui/CardShell";

const D = copy.copilot.demand;

export function DemandByStoreCard({ data }: { data: DemandByStore }) {
  const rows = data.stores.map((s) => ({
    name: displayBranchName(s.store),
    units: s.recent_units,
    changePct: s.change_pct,
    next7: s.forecast_next_7d_units,
  }));
  return (
    <CardShell
      eyebrow={D.eyebrow}
      title={data.product.product_name}
      subtitle={D.subtitle(formatInteger(data.network_recent_units), data.stores.length, data.days, formatLongDate(data.data_as_of))}
    >
      <BranchDemandChart rows={rows} days={data.days} />
      <details className="text-sm">
        <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-primary">{D.table}</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-block border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-background text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{D.branch}</th>
                <th scope="col" className="px-3 py-2 font-medium">{D.zone}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{D.units}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{D.change}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{D.next7}</th>
              </tr>
            </thead>
            <tbody>
              {data.stores.map((s) => (
                <tr key={s.store.store_id} className="border-t border-line">
                  <td className="px-3 py-1.5">{displayBranchName(s.store)}</td>
                  <td className="px-3 py-1.5 text-muted">{t("zone", s.store.zone_type)}</td>
                  <td className="tabular px-3 py-1.5 text-right">{formatInteger(s.recent_units)}</td>
                  <td className="tabular px-3 py-1.5 text-right">{formatPct(s.change_pct)}</td>
                  <td className="tabular px-3 py-1.5 text-right">{formatUnits(s.forecast_next_7d_units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </CardShell>
  );
}
