import { formatInteger, formatMoneyWhole, formatPct, formatRange, formatShortDate } from "@/lib/copilot/format";
import type { Alert, RiskLevel, StoreOverview } from "@/types/copilot";

import { DailySalesChart } from "../charts/DailySalesChart";
import { CardShell } from "../ui/CardShell";
import { StatTile } from "../ui/StatTile";

const ALERT_ICON: Record<Alert["kind"], string> = {
  run_out: "Run-out",
  expiration: "Expiration",
  demand_spike: "Demand spike",
  no_demand: "No demand",
};
const SEVERITY_DOT: Record<RiskLevel, string> = { high: "bg-sc-critical", medium: "bg-sc-warning", low: "bg-sc-good" };

export function StoreOverviewCard({ data }: { data: StoreOverview }) {
  const k = data.kpis;
  return (
    <CardShell
      eyebrow="Store overview"
      title={data.store.store_name}
      subtitle={`${data.store.zone_type} zone · ${formatRange(data.period_from, data.period_to)}`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Total sales"
          value={formatMoneyWhole(k.total_sales)}
          detail={`${formatPct(k.sales_change_pct)} vs previous period`}
          tone={k.sales_change_pct >= 0 ? "good" : "bad"}
        />
        <StatTile label="Run-outs" value={formatInteger(k.run_outs)} detail="High run-out risk now" tone={k.run_outs ? "bad" : "neutral"} />
        <StatTile label="No demand" value={formatInteger(k.no_demand)} detail="No sales in 14 days" />
        <StatTile label="Waste risk" value={formatInteger(k.waste_risk_products)} detail="Products likely to expire" />
      </div>

      <div>
        <h4 className="mb-1 text-sm font-medium">Daily sales, last 28 days</h4>
        <DailySalesChart series={data.daily_sales} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium">Top movers (28 days vs previous 28)</h4>
          <ul className="mt-1 space-y-1 text-sm">
            {[...data.top_movers_up.slice(0, 3), ...data.top_movers_down.slice(0, 2)].map((m) => (
              <li key={m.product.product_id} className="flex justify-between gap-3">
                <span className="truncate text-sc-ink-secondary">
                  {m.change_pct >= 0 ? "↗" : "↘"} {m.product.product_name}
                </span>
                <span className={`tabular font-medium ${m.change_pct >= 0 ? "text-sc-good-ink" : "text-sc-critical-ink"}`}>
                  {formatPct(m.change_pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium">Alerts</h4>
          {data.alerts.length === 0 ? (
            <p className="mt-1 text-sm text-sc-ink-muted">No alerts right now.</p>
          ) : (
            <ul className="mt-1 max-h-48 space-y-1.5 overflow-auto text-sm">
              {data.alerts.map((a) => (
                <li key={`${a.kind}-${a.product_id}`} className="flex gap-2">
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${SEVERITY_DOT[a.severity]}`} />
                  <span className="text-sc-ink-secondary">
                    <span className="font-medium text-sc-ink">
                      {ALERT_ICON[a.kind]} ({a.severity}){a.date ? ` · ${formatShortDate(a.date)}` : ""}:
                    </span>{" "}
                    {a.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CardShell>
  );
}
