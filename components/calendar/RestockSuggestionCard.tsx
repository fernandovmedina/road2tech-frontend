import { copy } from "@/lib/copy";
import { formatDate, formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { RestockReason, RestockSuggestion } from "@/types";

const R = copy.calendar.suggestions;

const reasonTone: Record<RestockReason, Tone> = {
  stockout: "red",
  expiry: "amber",
  below_min: "amber",
  demand_spike: "blue",
  season: "gray",
};

export function RestockSuggestionCard({
  suggestion,
  productName,
  onOrder,
  onFocus,
}: {
  suggestion: RestockSuggestion;
  productName: string;
  onOrder: (s: RestockSuggestion) => void;
  onFocus: (productId: string, date: string) => void;
}) {
  const s = suggestion;
  const sent = s.order_status === "sent";

  return (
    <article className={`rounded-xl border p-3 ${s.is_urgent && !sent ? "border-alert/50 bg-alert-tint/40" : "border-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold leading-snug">{productName}</h4>
        <div className="flex flex-wrap justify-end gap-1">
          {s.is_urgent && !sent && <Badge tone="red">{t("restockReason", "urgent")}</Badge>}
          {s.reasons.map((r) => (
            <Badge key={r} tone={reasonTone[r]}>{t("restockReason", r)}</Badge>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        {R.suggestedQty}: <strong className="text-foreground">{formatNumber(s.suggested_qty)} {copy.common.units}</strong>
        {" · "}
        {s.supplier.supplier_name}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {R.orderOn}: <strong className="text-foreground">{formatDate(s.order_date)}</strong>
        {" · "}
        {R.arrivesOn}: <strong className="text-foreground">{formatDate(s.expected_delivery_date)}</strong>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {sent ? (
          <Badge tone="green">{R.ordered}</Badge>
        ) : (
          <Button size="sm" onClick={() => onOrder(s)}>
            {R.orderBtn}
            <span className="sr-only"> · {productName}</span>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onFocus(s.product_id, s.expected_delivery_date)}>
          {copy.common.viewInCalendar}
          <span className="sr-only"> · {productName}</span>
        </Button>
      </div>
    </article>
  );
}
