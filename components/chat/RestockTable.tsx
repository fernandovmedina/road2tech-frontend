"use client";

import { useBranches, useProducts, useSuppliers } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { RestockSuggestion } from "@/types";

const T = copy.calendar;

export function RestockTable({ suggestions }: { suggestions: RestockSuggestion[] }) {
  const products = useProducts().data ?? [];
  const suppliers = useSuppliers().data ?? [];
  const branches = useBranches().data ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold text-muted">
            <th className="py-2 pr-3">{copy.common.product}</th>
            <th className="py-2 pr-3">{copy.common.branch}</th>
            <th className="py-2 pr-3">{T.suggestedQty}</th>
            <th className="py-2 pr-3">{T.supplier}</th>
            <th className="py-2">{copy.calendar.modal.expectedGain}</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((s) => (
            <tr key={s.id} className="border-t border-line">
              <td className="py-2 pr-3 font-semibold">
                {products.find((p) => p.id === s.productId)?.name}
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.reasons.map((r) => <Badge key={r} tone={r === "stockout" ? "red" : r === "demand_spike" ? "blue" : "amber"}>{T.tags[r]}</Badge>)}
                </div>
              </td>
              <td className="py-2 pr-3">{branches.find((b) => b.id === s.branchId)?.name}</td>
              <td className="py-2 pr-3">{formatNumber(s.suggestedQty)} {copy.common.units}</td>
              <td className="py-2 pr-3">{suppliers.find((x) => x.id === s.supplierId)?.name}</td>
              <td className="py-2 font-bold text-primary">+{formatMoney(s.expectedGainIfOrdered)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
