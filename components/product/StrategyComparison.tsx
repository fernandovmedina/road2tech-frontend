import type { ReactNode } from "react";
import { copy } from "@/lib/copy";
import { formatMoney, formatNumber, formatSignedMoney } from "@/lib/format";
import { riskLevel, riskTone, signedUnits, type RiskLevel } from "@/components/strategy/strategyFormat";
import { periodDays } from "./periodText";
import type { DiscountPoint, Strategy } from "@/types";

const K = copy.product.compare;
const L = copy.strategy.promo;

type Scenario = Strategy["baseline"];
type Good = "up" | "down";
type Row = { key: string; label: string; base: ReactNode; treated: ReactNode; diff: ReactNode; delta: number; good: Good };

/** Colors the difference: green when it moves in the good direction, red when not, muted when there is no change. */
function diffClass(delta: number, good: Good): string {
  if (Math.abs(delta) < 0.5) return "text-muted"; // rounds to zero: neither good nor bad
  return (delta > 0) === (good === "up") ? "text-primary" : "text-alert-dark";
}

const riskRank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

function Risk({ value }: { value: number }) {
  const level = riskLevel(value);
  return <span className={`font-bold ${riskTone[level]}`}>{L.riskLevels[level]}</span>;
}

/** Waste shown as a cost: "−$10,150", or "$0" when nothing is thrown away. */
const wasteMoney = (v: number): string => (v > 0 ? `−${formatMoney(v)}` : formatMoney(0));

/** "Si no aceptas": the loss is the headline when there is waste, otherwise the profit the store keeps. */
function DeclineCard({ b }: { b: Scenario }) {
  const waste = b.waste_cost > 0;
  return (
    <section aria-label={K.decline} className="rounded-xl bg-accent-tint p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-accent-dark">{K.decline}</h3>
      <p className="mt-2 text-3xl font-extrabold tabular-nums text-accent-dark">
        {waste ? K.wasteHeadline(formatMoney(b.waste_cost)) : K.profitHeadline(formatMoney(b.margin))}
      </p>
      <p className="mt-2 text-sm text-accent-dark">
        {waste ? K.declineWithWaste(K.wasteUnits(Math.round(b.waste_units)), formatMoney(b.margin)) : K.declineNoWaste(formatMoney(b.margin))}
      </p>
    </section>
  );
}

/** "Si aceptas": the gain the model expects at the chosen discount, with the profit it leaves. */
function AcceptCard({ a, b, gain }: { a: Scenario; b: Scenario; gain: number }) {
  const good = gain >= 0;
  return (
    <section aria-label={K.accept} className={`rounded-xl p-5 ${good ? "bg-primary-tint" : "bg-alert-tint"}`}>
      <h3 className={`text-[11px] font-extrabold uppercase tracking-wide ${good ? "text-primary" : "text-alert-dark"}`}>{K.accept}</h3>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums ${good ? "text-primary" : "text-alert-dark"}`}>{formatSignedMoney(gain)}</p>
      <p className={`mt-2 text-sm ${good ? "text-primary" : "text-alert-dark"}`}>
        {K.acceptText(formatMoney(a.margin), formatMoney(b.margin), K.wasteUnits(Math.round(a.waste_units)))}
      </p>
    </section>
  );
}

/**
 * "Qué ganas y qué pierdes": "Si no aceptas" (baseline) vs "Si aceptas" (the chosen point of the discount curve), then a
 * table with the details and, as `children`, the action buttons. Every figure is delivered by the backend; the only
 * operations here are subtracting (or, for the gross margin, adding the waste cost back to the net margin the backend
 * delivers) two delivered values to show a difference.
 * TODO(backend): send the gross margin of each scenario if "Margen de las ventas" must not be derived here.
 */
export function StrategyComparison({ strategy, point, children }: { strategy: Strategy; point: DiscountPoint; children?: ReactNode }) {
  const b = strategy.baseline;
  const a = point.treated;
  const gain = point.expected_margin_increment;
  const wasteGain = b.waste_cost - a.waste_cost;
  const grossBase = b.margin + b.waste_cost;
  const grossTreated = a.margin + a.waste_cost;
  const riskDiff = riskRank[riskLevel(a.stockout_risk)] - riskRank[riskLevel(b.stockout_risk)];

  const rows: Row[] = [
    { key: "units", label: K.rows.units, base: formatNumber(b.units), treated: formatNumber(a.units), diff: signedUnits(point.expected_units_increment), delta: point.expected_units_increment, good: "up" },
    { key: "revenue", label: K.rows.revenue, base: formatMoney(b.net_revenue), treated: formatMoney(a.net_revenue), diff: formatSignedMoney(point.expected_sales_increment), delta: point.expected_sales_increment, good: "up" },
    { key: "margin", label: K.rows.margin, base: formatMoney(grossBase), treated: formatMoney(grossTreated), diff: formatSignedMoney(grossTreated - grossBase), delta: grossTreated - grossBase, good: "up" },
    { key: "wasteCost", label: K.rows.wasteCost, base: wasteMoney(b.waste_cost), treated: wasteMoney(a.waste_cost), diff: formatSignedMoney(wasteGain), delta: wasteGain, good: "up" },
    {
      key: "risk",
      label: K.rows.stockoutRisk,
      base: <Risk value={b.stockout_risk} />,
      treated: <Risk value={a.stockout_risk} />,
      diff: riskDiff > 0 ? K.riskChange.up : riskDiff < 0 ? K.riskChange.down : K.riskChange.same,
      delta: riskDiff,
      good: "down",
    },
  ];

  return (
    <section aria-labelledby="compare-title" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <div>
        <h2 id="compare-title" className="text-lg font-extrabold">{K.title}</h2>
        <p className="text-sm text-muted">{K.subtitle(periodDays(strategy.period.start_date, strategy.period.end_date))}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
        <DeclineCard b={b} />
        <AcceptCard a={a} b={b} gain={gain} />
      </div>

      <div className="relative overflow-x-auto rounded-xl bg-background">
        <table className="w-full min-w-[520px] text-sm tabular-nums">
          <caption className="sr-only">{K.title}</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">{K.concept}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{K.withoutPromo}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{K.withPromo}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{K.difference}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <th scope="row" className="px-4 py-3 text-left font-medium">{r.label}</th>
                <td className="px-4 py-3">{r.base}</td>
                <td className="px-4 py-3">{r.treated}</td>
                <td className={`px-4 py-3 font-bold ${diffClass(r.delta, r.good)}`}>{r.diff}</td>
              </tr>
            ))}
            <tr className="border-t border-line bg-background font-extrabold">
              <th scope="row" className="px-4 py-3 text-left font-extrabold">{K.rows.profit}</th>
              <td className="px-4 py-3">{formatMoney(b.margin)}</td>
              <td className="px-4 py-3">{formatMoney(a.margin)}</td>
              <td className={`px-4 py-3 ${gain >= 0 ? "text-primary" : "text-alert-dark"}`}>{formatSignedMoney(gain)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {children}
    </section>
  );
}
