import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatDate, formatDateYear, formatNumber, formatRate } from "@/lib/format";
import { t } from "@/lib/labels";
import { calendarHref } from "@/lib/links";
import { Badge } from "@/components/ui/Badge";
import type { StockItem } from "@/types";
import { StockLevelBar } from "./StockLevelBar";
import { statusTone } from "./statusStyles";

const S = copy.stock;

export function StockRow({ item, branchName }: { item: StockItem; branchName: string | null }) {
  return (
    <tr className="border-b border-line align-top last:border-0">
      <th scope="row" className="px-5 py-3 text-left font-normal">
        <p className="font-bold">{item.product_name}</p>
        <p className="text-xs text-muted">{t("category", item.category_id)}</p>
      </th>
      {branchName !== null && <td className="py-3 pr-3">{branchName}</td>}
      <td className="py-3 pr-3 text-right font-bold tabular-nums">{formatNumber(item.closing_qty)}</td>
      <td className="py-3 pr-3">
        <StockLevelBar quantity={item.closing_qty} min={item.reorder_point} max={item.max_stock} status={item.status} />
      </td>
      <td className="py-3 pr-3 tabular-nums">{S.coverageDays(formatRate(item.coverage_days))}</td>
      <td className="py-3 pr-3">
        <Badge tone={statusTone[item.status]}>{t("stockStatus", item.status)}</Badge>
      </td>
      <td className="py-3 pr-3">
        {item.in_transit.length === 0 ? (
          S.none
        ) : (
          <ul className="flex flex-col gap-1">
            {item.in_transit.map((o) => (
              <li key={o.order_id} className="flex flex-wrap items-center gap-1.5">
                <span className={o.is_delayed ? "font-bold text-alert-dark" : ""}>
                  {S.inTransitLine(formatNumber(o.quantity), formatDate(o.expected_delivery_date))}
                </span>
                {o.is_delayed && <Badge tone="red">{S.delayed}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="py-3 pr-3">
        {item.earliest_expiry ? (
          <>
            <time dateTime={item.earliest_expiry}>{formatDateYear(item.earliest_expiry)}</time>
            {item.expiring_qty_7d > 0 && (
              <p className="mt-0.5 text-xs font-bold text-alert-dark">{S.expiringSoon(formatNumber(item.expiring_qty_7d))}</p>
            )}
          </>
        ) : (
          S.none
        )}
      </td>
      <td className="py-3 pr-3">
        {item.next_restock_date ? <time dateTime={item.next_restock_date}>{formatDate(item.next_restock_date)}</time> : S.none}
      </td>
      <td className="py-3 pr-5 text-right">
        <Link
          href={calendarHref({ storeId: item.store_id, productId: item.product_id, date: item.next_restock_date ?? undefined })}
          className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[10px] border border-line px-3 text-sm font-semibold hover:bg-background"
        >
          {copy.common.viewInCalendar}
          <span className="sr-only"> · {item.product_name}</span>
        </Link>
      </td>
    </tr>
  );
}
