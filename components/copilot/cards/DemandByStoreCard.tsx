import { formatInteger, formatLongDate, formatPct, formatUnits } from "@/lib/copilot/format";
import type { DemandByStore } from "@/types/copilot";

import { BranchDemandChart } from "../charts/BranchDemandChart";
import { CardShell } from "../ui/CardShell";

export function DemandByStoreCard({ data }: { data: DemandByStore }) {
  const rows = data.stores.map((s) => ({
    name: s.store.store_name.replace(/^OXXO /, ""),
    units: s.recent_units,
    changePct: s.change_pct,
    next7: s.forecast_next_7d_units,
  }));
  return (
    <CardShell
      eyebrow="Demand by branch"
      title={data.product.product_name}
      subtitle={`${formatInteger(data.network_recent_units)} units across ${data.stores.length} branches · last ${data.days} days to ${formatLongDate(data.data_as_of)}`}
    >
      <BranchDemandChart rows={rows} days={data.days} />
      <details className="text-sm">
        <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-sc-accent">Table view</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-sc-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-sc-surface-muted text-sc-ink-secondary">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Branch</th>
                <th scope="col" className="px-3 py-2 font-medium">Zone</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Units</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Change</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Next 7 days</th>
              </tr>
            </thead>
            <tbody>
              {data.stores.map((s) => (
                <tr key={s.store.store_id} className="border-t border-sc-line">
                  <td className="px-3 py-1.5">{s.store.store_name}</td>
                  <td className="px-3 py-1.5 text-sc-ink-secondary">{s.store.zone_type}</td>
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
