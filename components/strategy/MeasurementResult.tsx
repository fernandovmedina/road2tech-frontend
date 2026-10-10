import { copy } from "@/lib/copy";
import { formatMoney, formatNumber, formatSignedMoney } from "@/lib/format";
import type { Strategy } from "@/types";

const M = copy.strategy.measurement;

/** Measured strategies: what actually happened next to what the engine expected. Values come as delivered. */
export function MeasurementResult({ strategy }: { strategy: Strategy }) {
  const m = strategy.measurement;
  if (!m) return null;
  const rows = [
    { label: M.marginIncrement, expected: formatSignedMoney(strategy.expected_margin_increment), actual: formatSignedMoney(m.actual_margin_increment) },
    { label: M.margin, expected: formatMoney(strategy.treated.margin), actual: formatMoney(m.actual.margin) },
    { label: M.revenue, expected: formatMoney(strategy.treated.net_revenue), actual: formatMoney(m.actual.net_revenue) },
    { label: M.units, expected: formatNumber(strategy.treated.units), actual: formatNumber(m.actual.units) },
  ];
  return (
    <section className="flex flex-col gap-2 rounded-[10px] border border-line bg-background p-3">
      <h4 className="text-sm font-extrabold">{M.title}</h4>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="py-1 font-semibold"><span className="sr-only">{M.concept}</span></th>
            <th scope="col" className="py-1 text-right font-semibold">{M.expected}</th>
            <th scope="col" className="py-1 text-right font-semibold">{M.actual}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line">
              <th scope="row" className="py-1.5 text-left font-medium">{r.label}</th>
              <td className="py-1.5 text-right text-muted">{r.expected}</td>
              <td className="py-1.5 text-right font-bold">{r.actual}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted">{m.control_group_used ? M.withControl : M.withoutControl}</p>
    </section>
  );
}
