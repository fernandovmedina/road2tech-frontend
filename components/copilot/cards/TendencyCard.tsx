import { formatInteger, formatLongDate, formatPct, formatShortDate, formatUnits } from "@/lib/copilot/format";
import type { ProductTendency, Trend } from "@/types/copilot";

import { TendencyChart } from "../charts/TendencyChart";
import { CardShell } from "../ui/CardShell";
import { RiskBadge } from "../ui/RiskBadge";
import { StatTile } from "../ui/StatTile";

const TREND_LABEL: Record<Trend, string> = { increasing: "↗ Increasing", stable: "→ Stable", decreasing: "↘ Decreasing" };

export function TendencyCard({ data }: { data: ProductTendency }) {
  const { inventory, stockout_risk: stock, waste_risk: waste } = data;
  return (
    <CardShell
      eyebrow="Product trend · forecast"
      title={`${data.product.product_name} · ${data.store.store_name}`}
      subtitle={`${data.product.category_name} · data as of ${formatLongDate(data.data_as_of)}`}
      aside={
        <>
          <RiskBadge label="Run-out risk" level={stock.level} />
          <RiskBadge label="Waste risk" level={waste.level} />
        </>
      }
      footer={
        <>
          Forecast model: {data.model.name}
          {data.model.backtest_wape_14d !== null ? ` · last-14-day error (WAPE) ${Math.round(data.model.backtest_wape_14d * 100)}%` : ""} ·
          predictions use sales-behavior trends + calendar events and weather. Synthetic dataset.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Trend"
          value={TREND_LABEL[data.trend]}
          detail={`${formatPct(data.trend_pct_per_week)} per week`}
          tone={data.trend === "increasing" ? "good" : data.trend === "decreasing" ? "bad" : "neutral"}
        />
        <StatTile
          label={`Forecast, next ${data.forecast_days} days`}
          value={`${formatUnits(data.forecast_avg_daily_units)} / day`}
          detail={`${formatPct(data.forecast_vs_recent_pct)} vs last 28 days`}
        />
        <StatTile
          label="Stock on hand"
          value={`${formatInteger(inventory.on_hand)} units`}
          detail={
            stock.days_of_cover !== null ? `~${formatUnits(stock.days_of_cover)} days of cover` : "No recent demand"
          }
        />
        <StatTile
          label="In transit"
          value={`${formatInteger(inventory.in_transit)} units`}
          detail={inventory.next_delivery_date ? `Next delivery ${formatShortDate(inventory.next_delivery_date)}` : "No open orders"}
        />
      </div>

      <TendencyChart history={data.historical_series} forecast={data.forecast_series} dataAsOf={data.data_as_of} />

      <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm">
        <p className="font-medium text-ink">Suggestion</p>
        <p className="mt-0.5 text-ink-secondary">{data.ai_summary}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium">Main drivers</h4>
          {data.main_drivers.length === 0 ? (
            <p className="mt-1 text-sm text-ink-muted">No strong weekday, weather or event effect.</p>
          ) : (
            <ul className="mt-1 space-y-1.5 text-sm">
              {data.main_drivers.map((driver) => (
                <li key={`${driver.kind}-${driver.name}`} className="flex gap-2">
                  <span className="tabular w-14 shrink-0 text-right font-medium">{formatPct(driver.impact_pct)}</span>
                  <span className="text-ink-secondary">{driver.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-medium">Risks</h4>
          <p className="text-ink-secondary">
            <span className="font-medium text-ink">Run-out:</span> {stock.detail}
            {stock.first_stockout_date ? ` Without a new order, the shelf empties around ${formatShortDate(stock.first_stockout_date)}.` : ""}
          </p>
          <p className="text-ink-secondary">
            <span className="font-medium text-ink">Waste:</span> {waste.detail}
          </p>
        </div>
      </div>
    </CardShell>
  );
}
