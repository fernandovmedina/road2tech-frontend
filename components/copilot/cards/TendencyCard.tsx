import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatInteger, formatLongDate, formatPct, formatShortDate, formatUnits } from "@/lib/copilot/format";
import { t } from "@/lib/labels";
import type { ProductTendency } from "@/types/copilot";

import { TendencyChart } from "../charts/TendencyChart";
import { CardShell } from "../ui/CardShell";
import { RiskBadge } from "../ui/RiskBadge";
import { StatTile } from "../ui/StatTile";

const C = copy.copilot;
const T = C.tendency;
const S = C.stat;

export function TendencyCard({ data }: { data: ProductTendency }) {
  const { inventory, stockout_risk: stock, waste_risk: waste } = data;
  const wape = data.model.backtest_wape_14d !== null ? `${Math.round(data.model.backtest_wape_14d * 100)}%` : null;
  return (
    <CardShell
      eyebrow={T.eyebrow}
      title={`${data.product.product_name} · ${displayBranchName(data.store)}`}
      subtitle={T.subtitle(t("category", data.product.category_id), formatLongDate(data.data_as_of))}
      aside={
        <>
          <RiskBadge label={C.risk.runOut} level={stock.level} />
          <RiskBadge label={C.risk.waste} level={waste.level} />
        </>
      }
      footer={T.footer(data.model.name, wape)}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label={S.trend}
          value={t("agentTrend", data.trend)}
          detail={S.perWeek(formatPct(data.trend_pct_per_week))}
          tone={data.trend === "increasing" ? "good" : data.trend === "decreasing" ? "bad" : "neutral"}
        />
        <StatTile
          label={S.forecast(data.forecast_days)}
          value={S.perDay(formatUnits(data.forecast_avg_daily_units))}
          detail={S.vsRecent(formatPct(data.forecast_vs_recent_pct))}
        />
        <StatTile
          label={S.stockOnHand}
          value={S.units(formatInteger(inventory.on_hand))}
          detail={stock.days_of_cover !== null ? S.daysOfCover(formatUnits(stock.days_of_cover)) : S.noRecentDemand}
        />
        <StatTile
          label={S.inTransit}
          value={S.units(formatInteger(inventory.in_transit))}
          detail={inventory.next_delivery_date ? S.nextDelivery(formatShortDate(inventory.next_delivery_date)) : S.noOpenOrders}
        />
      </div>

      <TendencyChart history={data.historical_series} forecast={data.forecast_series} dataAsOf={data.data_as_of} />

      <div className="rounded-block bg-primary-tint px-4 py-3 text-sm">
        <p className="font-medium text-foreground">{T.suggestion}</p>
        <p className="mt-0.5 text-muted">{data.ai_summary}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium">{T.drivers}</h4>
          {data.main_drivers.length === 0 ? (
            <p className="mt-1 text-sm text-subtle">{T.noDrivers}</p>
          ) : (
            <ul className="mt-1 space-y-1.5 text-sm">
              {data.main_drivers.map((driver) => (
                <li key={`${driver.kind}-${driver.name}`} className="flex gap-2">
                  <span className="tabular w-14 shrink-0 text-right font-medium">{formatPct(driver.impact_pct)}</span>
                  <span className="text-muted">{driver.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-medium">{T.risks}</h4>
          <p className="text-muted">
            <span className="font-medium text-foreground">{T.runOut}</span> {stock.detail}
            {stock.first_stockout_date ? T.emptiesAround(formatShortDate(stock.first_stockout_date)) : ""}
          </p>
          <p className="text-muted">
            <span className="font-medium text-foreground">{T.waste}</span> {waste.detail}
          </p>
        </div>
      </div>
    </CardShell>
  );
}
