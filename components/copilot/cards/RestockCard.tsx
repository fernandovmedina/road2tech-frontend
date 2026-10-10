import Link from "next/link";

import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatInteger, formatLongDate, formatMoney, formatShortDate, formatUnits } from "@/lib/copilot/format";
import { calendarHref } from "@/lib/links";
import { t } from "@/lib/labels";
import type { RestockPlan, RestockSuggestion } from "@/types/copilot";

import { CardShell } from "../ui/CardShell";

const R = copy.copilot.restock;

function SuggestionRow({ item }: { item: RestockSuggestion }) {
  return (
    <li className="rounded-block border border-line px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {item.is_urgent ? (
              <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-alert px-2 py-0.5 text-xs font-semibold text-white">
                ▲ {R.urgent}
              </span>
            ) : null}
            {formatInteger(item.suggested_qty)} × {item.product.product_name}
          </p>
          <p className="mt-0.5 text-sm text-muted">{item.supplier.supplier_name}</p>
          <p className="mt-0.5 text-sm text-muted">
            {R.orderToday(formatShortDate(item.expected_arrival_date), item.lead_time_days)} · {formatMoney(item.order_cost)}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{item.days_of_cover !== null ? R.daysOfCover(formatUnits(item.days_of_cover)) : "—"}</p>
          <p className="text-subtle">{R.stockLine(formatInteger(item.on_hand), formatInteger(item.in_transit))}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.reasons.map((reason) => (
          <span key={reason} className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
            {t("agentRestockReason", reason)}
          </span>
        ))}
      </div>
      <ul className="mt-1.5 list-disc pl-5 text-xs text-muted">
        {item.reason_details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </li>
  );
}

/** Read-only: the chat never sends orders. The order is reviewed and confirmed from the restock calendar. */
export function RestockCard({ data }: { data: RestockPlan }) {
  return (
    <CardShell
      eyebrow={R.eyebrow}
      title={R.title(displayBranchName(data.store))}
      subtitle={R.subtitle(data.checked_products, formatLongDate(data.data_as_of))}
      footer={R.footer}
    >
      {data.suggestions.length === 0 ? (
        <p className="text-sm text-muted">{data.notes.length ? data.notes.join(" ") : R.empty}</p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.suggestions.map((item) => (
              <SuggestionRow key={item.id} item={item} />
            ))}
          </ul>
          <p className="text-sm text-muted">
            {R.note}{" "}
            <Link
              href={calendarHref({ storeId: data.store.store_id })}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {R.openCalendar}
            </Link>
          </p>
        </>
      )}
    </CardShell>
  );
}
