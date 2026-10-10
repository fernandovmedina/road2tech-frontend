import { copy } from "@/lib/copy";
import { formatInteger, formatSignedPercent, formatSignedPoints } from "@/lib/format";
import type { ScenarioRow } from "@/lib/opportunities/predictionInsights";

type ProductImpactTableProps = {
  rows: readonly ScenarioRow[];
  weekdayLabel: string;
};

export function ProductImpactTable({ rows, weekdayLabel }: ProductImpactTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">{copy.opportunities.impactTable.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="pb-2 font-medium">{copy.opportunities.impactTable.product}</th>
            <th scope="col" className="pb-2 text-right font-medium">{copy.opportunities.impactTable.expectedChange}</th>
            <th scope="col" className="pb-2 pl-2 text-right font-medium">{copy.opportunities.impactTable.extraStock}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId} className="border-t border-line align-top">
              <th scope="row" className="py-2 pr-2 text-left font-medium text-foreground">
                {row.productName}
              </th>
              <td className="py-2 text-right tabular-nums">
                <span className="font-semibold text-foreground">
                  {formatSignedPercent(row.scenarios.withEventPct)}
                </span>
                <span className="block text-xs text-muted">
                  {copy.opportunities.impactTable.fromEvent(formatSignedPoints(row.effectPp))}
                </span>
              </td>
              <td className="py-2 pl-2 text-right tabular-nums text-foreground">
                {copy.opportunities.impactTable.units(formatInteger(row.recommendedExtraUnits))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted">
        {copy.opportunities.impactTable.footnote(weekdayLabel)}
      </p>
    </div>
  );
}
