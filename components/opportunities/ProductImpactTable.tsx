import { formatInteger, formatSignedPercent, formatSignedPoints } from "@/lib/format";
import type { ScenarioRow } from "@/lib/opportunities/predictionInsights";

type ProductImpactTableProps = {
  rows: readonly ScenarioRow[];
  weekdayLabel: string;
};

export function ProductImpactTable({ rows, weekdayLabel }: ProductImpactTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-secondary">No product is expected to change with this event.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-secondary">
            <th scope="col" className="pb-2 font-medium">Product</th>
            <th scope="col" className="pb-2 text-right font-medium">Expected change</th>
            <th scope="col" className="pb-2 pl-2 text-right font-medium">Extra stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId} className="border-t border-hairline align-top">
              <th scope="row" className="py-2 pr-2 text-left font-medium text-ink">
                {row.productName}
              </th>
              <td className="py-2 text-right tabular-nums">
                <span className="font-semibold text-ink">
                  {formatSignedPercent(row.scenarios.withEventPct)}
                </span>
                <span className="block text-xs text-ink-secondary">
                  {formatSignedPoints(row.effectPp)} from the event
                </span>
              </td>
              <td className="py-2 pl-2 text-right tabular-nums text-ink">
                +{formatInteger(row.recommendedExtraUnits)} units
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-secondary">
        Expected change is versus an average day. Extra stock is on top of a normal{" "}
        {weekdayLabel} order, across affected branches.
      </p>
    </div>
  );
}
