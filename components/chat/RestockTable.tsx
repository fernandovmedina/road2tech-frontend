"use client";

import Link from "next/link";
import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { calendarHref } from "@/lib/links";
import { t } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import type { RestockSuggestion } from "@/types";

const C = copy.chat.restock;

/**
 * Read-only restock suggestions. The chat never sends orders: each row links to the calendar,
 * where the order modal asks for confirmation.
 */
export function RestockTable({ suggestions }: { suggestions: RestockSuggestion[] }) {
  const { nameOf } = useCatalog();

  return (
    <section aria-label={C.title} className="w-full max-w-3xl rounded-2xl border border-line bg-white p-4">
      <h3 className="mb-2 text-sm font-bold">{C.title}</h3>
      {suggestions.length === 0 ? (
        <p className="text-sm text-muted">{C.empty}</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold text-muted">
                <th scope="col" className="py-2 pr-3">{C.cols.product}</th>
                <th scope="col" className="py-2 pr-3">{C.cols.supplier}</th>
                <th scope="col" className="py-2 pr-3 text-right">{C.cols.qty}</th>
                <th scope="col" className="py-2 pr-3 text-right">{C.cols.cost}</th>
                <th scope="col" className="py-2 pr-3">{C.cols.orderDate}</th>
                <th scope="col" className="py-2 pr-3">{C.cols.delivery}</th>
                <th scope="col" className="py-2"><span className="sr-only">{copy.common.viewInCalendar}</span></th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id} className="border-t border-line align-top">
                  <td className="py-2 pr-3 font-semibold">
                    {nameOf(s.product_id)}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.is_urgent && <Badge tone="red">{C.urgent}</Badge>}
                      {s.reasons.map((r) => (
                        <Badge key={r} tone={r === "stockout" ? "red" : r === "demand_spike" ? "blue" : "amber"}>
                          {t("restockReason", r)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-3">{s.supplier.supplier_name}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(s.suggested_qty)} {copy.common.units}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(s.estimated_cost)}</td>
                  <td className="py-2 pr-3">{formatDate(s.order_date)}</td>
                  <td className="py-2 pr-3">{formatDate(s.expected_delivery_date)}</td>
                  <td className="py-2 text-right">
                    <Link
                      href={calendarHref({ storeId: s.store_id, productId: s.product_id, date: s.order_date })}
                      className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[10px] px-2 text-sm font-semibold text-primary hover:bg-primary-tint"
                      aria-label={`${copy.common.viewInCalendar}: ${nameOf(s.product_id)}`}
                    >
                      {copy.common.viewInCalendar}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{C.note}</p>
    </section>
  );
}
