import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatInteger, formatMoneyWhole, formatPct, formatRange, formatShortDate } from "@/lib/copilot/format";
import { t } from "@/lib/labels";
import type { RiskLevel, StoreOverview } from "@/types/copilot";

import { DailySalesChart } from "../charts/DailySalesChart";
import { CardShell } from "../ui/CardShell";
import { StatTile } from "../ui/StatTile";

const O = copy.copilot.overview;

const SEVERITY_DOT: Record<RiskLevel, string> = { high: "bg-alert", medium: "bg-warning", low: "bg-primary" };

export function StoreOverviewCard({ data }: { data: StoreOverview }) {
  const k = data.kpis;
  return (
    <CardShell
      eyebrow={O.eyebrow}
      title={displayBranchName(data.store)}
      subtitle={O.subtitle(t("zone", data.store.zone_type), formatRange(data.period_from, data.period_to))}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label={O.totalSales}
          value={formatMoneyWhole(k.total_sales)}
          detail={O.vsPrevious(formatPct(k.sales_change_pct))}
          tone={k.sales_change_pct >= 0 ? "good" : "bad"}
        />
        <StatTile label={O.runOuts} value={formatInteger(k.run_outs)} detail={O.runOutsDetail} tone={k.run_outs ? "bad" : "neutral"} />
        <StatTile label={O.noDemand} value={formatInteger(k.no_demand)} detail={O.noDemandDetail} />
        <StatTile label={O.wasteRisk} value={formatInteger(k.waste_risk_products)} detail={O.wasteRiskDetail} />
      </div>

      <div>
        <h4 className="mb-1 text-sm font-medium">{O.dailySales}</h4>
        <DailySalesChart series={data.daily_sales} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium">{O.topMovers}</h4>
          <ul className="mt-1 space-y-1 text-sm">
            {[...data.top_movers_up.slice(0, 3), ...data.top_movers_down.slice(0, 2)].map((m) => (
              <li key={m.product.product_id} className="flex justify-between gap-3">
                <span className="truncate text-muted">
                  {m.change_pct >= 0 ? "↗" : "↘"} {m.product.product_name}
                </span>
                <span className={`tabular font-medium ${m.change_pct >= 0 ? "text-primary-hover" : "text-alert-dark"}`}>
                  {formatPct(m.change_pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium">{O.alerts}</h4>
          {data.alerts.length === 0 ? (
            <p className="mt-1 text-sm text-subtle">{O.noAlerts}</p>
          ) : (
            <ul className="mt-1 max-h-48 space-y-1.5 overflow-auto text-sm">
              {data.alerts.map((a) => (
                <li key={`${a.kind}-${a.product_id}`} className="flex gap-2">
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${SEVERITY_DOT[a.severity]}`} />
                  <span className="text-muted">
                    <span className="font-medium text-foreground">
                      {t("agentAlertKind", a.kind)} ({t("agentRiskLevel", a.severity).toLowerCase()}){a.date ? ` · ${formatShortDate(a.date)}` : ""}:
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
