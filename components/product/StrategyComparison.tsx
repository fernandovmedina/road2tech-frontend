import type { ReactNode } from "react";
import { copy } from "@/lib/copy";
import { formatDate, formatMoney, formatNumber, formatPct, formatSignedMoney } from "@/lib/format";
import { discountLabel, intervalText, signedPoints, signedUnits } from "@/components/strategy/strategyFormat";
import type { Strategy } from "@/types";

const K = copy.product.compare;

type Scenario = Strategy["baseline"];
type Good = "up" | "down";
type Row = { key: string; label: string; base: string; treated: string; diff: ReactNode; delta: number; good: Good };

/** Colors the difference: green when it moves in the good direction, red when not, muted when there is no change. */
function diffClass(delta: number, good: Good): string {
  if (delta === 0) return "text-muted";
  return (delta > 0) === (good === "up") ? "text-primary" : "text-alert-dark";
}

function ScenarioCard({ title, hint, scenario, accent }: { title: string; hint: string; scenario: Scenario; accent: boolean }) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${accent ? "border-accent/40 bg-accent-tint" : "border-line bg-white"}`}
    >
      <header>
        <h3 className={`text-base font-extrabold ${accent ? "text-accent-dark" : ""}`}>{title}</h3>
        <p className="text-xs text-muted">{hint}</p>
      </header>
      <p className="text-3xl font-extrabold tabular-nums">{formatMoney(scenario.margin)}</p>
      <p className="-mt-2 text-xs font-semibold text-muted">{K.rows.margin}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><dt className="text-xs text-muted">{K.rows.units}</dt><dd className="font-bold tabular-nums">{formatNumber(scenario.units)}</dd></div>
        <div><dt className="text-xs text-muted">{K.rows.revenue}</dt><dd className="font-bold tabular-nums">{formatMoney(scenario.net_revenue)}</dd></div>
        <div>
          <dt className="text-xs text-muted">{K.rows.wasteUnits}</dt>
          <dd className="font-bold tabular-nums">{formatNumber(scenario.waste_units)} · {formatMoney(scenario.waste_cost)}</dd>
        </div>
        <div><dt className="text-xs text-muted">{K.rows.stockoutRisk}</dt><dd className="font-bold tabular-nums">{formatPct(scenario.stockout_risk)}</dd></div>
      </dl>
    </section>
  );
}

/**
 * "Si no aceptas" (baseline) vs "Si aceptas" (treated). Every figure is delivered by the backend; the only operation
 * here is subtracting two delivered values to show a difference (the expected_* fields are used when they exist).
 * There is deliberately no control to change the discount: the engine proposes it.
 */
export function StrategyComparison({ strategy }: { strategy: Strategy }) {
  const { baseline: b, treated: t } = strategy;
  const rows: Row[] = [
    { key: "units", label: K.rows.units, base: formatNumber(b.units), treated: formatNumber(t.units), diff: signedUnits(strategy.expected_units_increment), delta: strategy.expected_units_increment, good: "up" },
    { key: "revenue", label: K.rows.revenue, base: formatMoney(b.net_revenue), treated: formatMoney(t.net_revenue), diff: formatSignedMoney(strategy.expected_sales_increment), delta: strategy.expected_sales_increment, good: "up" },
    { key: "margin", label: K.rows.margin, base: formatMoney(b.margin), treated: formatMoney(t.margin), diff: formatSignedMoney(strategy.expected_margin_increment), delta: strategy.expected_margin_increment, good: "up" },
    { key: "wasteUnits", label: K.rows.wasteUnits, base: formatNumber(b.waste_units), treated: formatNumber(t.waste_units), diff: signedUnits(t.waste_units - b.waste_units), delta: t.waste_units - b.waste_units, good: "down" },
    { key: "wasteCost", label: K.rows.wasteCost, base: formatMoney(b.waste_cost), treated: formatMoney(t.waste_cost), diff: formatSignedMoney(t.waste_cost - b.waste_cost), delta: t.waste_cost - b.waste_cost, good: "down" },
    { key: "stockoutRisk", label: K.rows.stockoutRisk, base: formatPct(b.stockout_risk), treated: formatPct(t.stockout_risk), diff: signedPoints(t.stockout_risk - b.stockout_risk), delta: t.stockout_risk - b.stockout_risk, good: "down" },
  ];

  return (
    <section aria-labelledby="compare-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="compare-title" className="text-lg font-extrabold">{K.title}</h2>
        <div className="rounded-[10px] bg-accent-tint px-4 py-2 text-right">
          <p className="text-xs font-semibold text-accent-dark">{K.proposedDiscount}</p>
          <p className="text-2xl font-extrabold tabular-nums text-accent-dark">{discountLabel(strategy.proposed_discount_pct)}</p>
          <p className="text-xs text-muted">{formatDate(strategy.period.start_date)} – {formatDate(strategy.period.end_date)}</p>
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted">{K.discountNote}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <ScenarioCard title={K.decline} hint={K.declineHint} scenario={b} accent={false} />
        <ScenarioCard title={K.accept} hint={K.acceptHint} scenario={t} accent />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[560px] text-sm tabular-nums">
          <caption className="sr-only">{K.title}</caption>
          <thead>
            <tr className="border-b border-line bg-background text-left text-xs text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">{K.concept}</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">{K.decline}</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">{K.accept}</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">{K.difference}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">{r.label}</th>
                <td className="px-4 py-3 text-right text-muted">{r.base}</td>
                <td className="px-4 py-3 text-right font-bold">{r.treated}</td>
                <td className={`px-4 py-3 text-right font-bold ${diffClass(r.delta, r.good)}`}>{r.diff}</td>
              </tr>
            ))}
            <tr className="bg-primary-tint">
              <th scope="row" className="px-4 py-3 text-left font-extrabold text-primary">
                {K.rows.net}
                <span className="block text-xs font-medium text-muted">{K.netNote}</span>
              </th>
              <td className="px-4 py-3 text-right text-muted">{K.none}</td>
              <td className="px-4 py-3 text-right text-lg font-extrabold text-primary">≈ {formatSignedMoney(strategy.expected_margin_increment)}</td>
              <td className="px-4 py-3 text-right text-xs text-muted">{intervalText(strategy.confidence_interval)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="-mt-2 text-xs text-muted">{copy.strategy.estimateNote}</p>
    </section>
  );
}
