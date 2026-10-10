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

/**
 * One column of the comparison. Both columns share this structure; only the tone changes: series-baseline
 * ("Si no aceptas") and series-scenario ("Si aceptas"), per the standard.
 */
function ScenarioCard({ label, headline, text, tone }: { label: string; headline: string; text: string; tone: "baseline" | "scenario" }) {
  const dark = tone === "scenario";
  return (
    <section aria-label={label} className={`rounded-block p-5 ${dark ? "bg-series-scenario text-white" : "bg-series-baseline text-foreground"}`}>
      <h3 className={`text-xs font-bold uppercase tracking-wide ${dark ? "text-white/80" : "text-foreground/80"}`}>{label}</h3>
      <p className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${dark ? "text-white" : "text-foreground"}`}>{headline}</p>
      <p className={`mt-2 text-sm ${dark ? "text-white/85" : "text-foreground/80"}`}>{text}</p>
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
    <section aria-labelledby="compare-title" className="flex flex-col gap-4 rounded-card border border-line bg-card p-5">
      <div>
        <h2 id="compare-title" className="text-lg font-bold">{K.title}</h2>
        <p className="text-sm text-muted">{K.subtitle(periodDays(strategy.period.start_date, strategy.period.end_date))}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ScenarioCard
          tone="baseline"
          label={K.decline}
          headline={b.waste_cost > 0 ? K.wasteHeadline(formatMoney(b.waste_cost)) : K.profitHeadline(formatMoney(b.margin))}
          text={b.waste_cost > 0 ? K.declineWithWaste(K.wasteUnits(Math.round(b.waste_units)), formatMoney(b.margin)) : K.declineNoWaste(formatMoney(b.margin))}
        />
        <ScenarioCard
          tone="scenario"
          label={K.accept}
          headline={formatSignedMoney(gain)}
          text={K.acceptText(formatMoney(a.margin), formatMoney(b.margin), K.wasteUnits(Math.round(a.waste_units)))}
        />
      </div>

      <div className="relative overflow-x-auto rounded-block bg-background">
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
          <tbody className="bg-card">
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <th scope="row" className="px-4 py-3 text-left font-medium">{r.label}</th>
                <td className="px-4 py-3">{r.base}</td>
                <td className="px-4 py-3">{r.treated}</td>
                <td className={`px-4 py-3 font-bold ${diffClass(r.delta, r.good)}`}>{r.diff}</td>
              </tr>
            ))}
            <tr className="border-t border-line bg-background font-bold">
              <th scope="row" className="px-4 py-3 text-left font-bold">{K.rows.profit}</th>
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
