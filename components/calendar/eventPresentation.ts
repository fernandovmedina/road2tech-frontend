import { copy } from "@/lib/copy";
import { formatDate, formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import type { CalendarEvent, RestockSuggestion } from "@/types";

const E = copy.calendar.events;

/** A restock order recommended by the agent that was not sent yet; drawn on the day it should be placed. */
export type SuggestedOrderEvent = { kind: "suggested"; id: string; date: string; product_id: string; suggestion: RestockSuggestion };
export type AnyEvent = CalendarEvent | SuggestedOrderEvent;

/**
 * What the manager sees, from most to least important. The order below is the priority used to sort every day:
 * things that need a decision (late or suggested orders, stock risk) come before what already happened or is on its way.
 */
export const CATEGORIES = ["delayed", "stockout", "suggestedUrgent", "suggested", "expiring", "strategy", "inTransit", "delivered"] as const;
export type EventCategory = (typeof CATEGORIES)[number];

const PRIORITY: Record<EventCategory, number> = Object.fromEntries(CATEGORIES.map((c, i) => [c, i])) as Record<EventCategory, number>;

export type DescribedEvent = {
  event: AnyEvent;
  category: EventCategory;
  /** Lower comes first (see CATEGORIES). */
  priority: number;
  /** Tie-breaker inside a category: bigger = more important. */
  weight: number;
  label: string;
  details: string[];
  /** Product the event is about (strategy events do not carry one). */
  productId: string | null;
  /** Set for suggested orders: lets the day panel open the Orden Restock modal. */
  suggestion?: RestockSuggestion;
};

export const categoryChip: Record<EventCategory, string> = {
  delayed: "border-alert bg-alert text-white",
  stockout: "border-alert/40 bg-alert-tint text-alert-dark",
  suggestedUrgent: "border-dashed border-2 border-info bg-info-tint text-info",
  suggested: "border-dashed border-info/60 bg-card text-info",
  expiring: "border-warning/40 bg-warning-tint text-warning-dark",
  strategy: "border-accent/30 bg-accent-tint text-accent-dark",
  inTransit: "border-primary/30 bg-primary-tint text-primary",
  delivered: "border-line bg-background text-muted",
};
export const categoryDot: Record<EventCategory, string> = {
  delayed: "bg-alert",
  stockout: "bg-alert/60",
  suggestedUrgent: "bg-info ring-2 ring-info/30",
  suggested: "bg-info/70",
  expiring: "bg-warning",
  strategy: "bg-accent",
  inTransit: "bg-primary",
  delivered: "bg-muted/50",
};

/** Sort inside a day or a list: priority first, then weight (bigger first), then id for a stable order. */
export function byPriority(a: DescribedEvent, b: DescribedEvent): number {
  return a.priority - b.priority || b.weight - a.weight || a.event.id.localeCompare(b.event.id);
}

function make(
  event: AnyEvent,
  category: EventCategory,
  label: string,
  details: string[],
  productId: string | null,
  weight = 0,
  suggestion?: RestockSuggestion,
): DescribedEvent {
  return { event, category, priority: PRIORITY[category], weight, label, details, productId, suggestion };
}

export function describeEvent(
  event: CalendarEvent,
  nameOf: (productId: string) => string,
  strategyTitleOf: (strategyId: string) => string | undefined,
  asOf: string,
): DescribedEvent {
  switch (event.kind) {
    case "delivery": {
      // The backend flags delivered orders; without the flag, anything up to "today" has already arrived.
      const delivered = event.delivered ?? event.date <= asOf;
      return make(
        event,
        delivered ? "delivered" : "inTransit",
        `${delivered ? E.delivered : E.inTransit}: ${nameOf(event.product_id)} (${E.deliveryItem(formatNumber(event.qty))})`,
        [event.order_id],
        event.product_id,
        event.qty,
      );
    }
    case "strategy":
      return make(
        event,
        "strategy",
        `${E.strategy}: ${strategyTitleOf(event.strategy_id) ?? t("strategyType", event.strategy_type)}`,
        [t("strategyStatus", event.status), `${formatDate(event.start_date)} – ${formatDate(event.end_date)}`],
        null,
      );
    case "alert": {
      const details: string[] = [];
      if (event.severity) details.push(E.severity[event.severity as keyof typeof E.severity] ?? event.severity);
      if (event.alert_type === "expiring_soon" && event.qty !== undefined) details.push(E.expiringQty(formatNumber(event.qty)));
      if (event.delay_days !== undefined) details.push(E.delayDays(event.delay_days));
      if (event.expected_delivery_date) details.push(E.expectedOn(formatDate(event.expected_delivery_date)));
      // A late order that already arrived is history, not an open problem: it is shown as delivered (with its delay).
      if (event.alert_type === "order_delayed" && event.actual_delivery_date) {
        return make(
          event,
          "delivered",
          `${E.deliveredLate(event.delay_days ?? 0)}: ${nameOf(event.product_id)}`,
          details,
          event.product_id,
        );
      }
      const category: EventCategory =
        event.alert_type === "order_delayed" ? "delayed" : event.alert_type === "stockout_risk" ? "stockout" : "expiring";
      return make(
        event,
        category,
        `${category === "delayed" ? "⚠ " : ""}${E.alerts[event.alert_type]}: ${nameOf(event.product_id)}`,
        details,
        event.product_id,
        (event.delay_days ?? 0) + (event.severity === "high" ? 100 : 0) + (event.qty ?? 0) / 1000,
      );
    }
  }
}

/** A recommended order: urgent ones weigh more, then the ones with more sales at risk. */
export function describeSuggestion(s: RestockSuggestion, nameOf: (productId: string) => string): DescribedEvent {
  const event: SuggestedOrderEvent = { kind: "suggested", id: `sg_${s.id}`, date: s.order_date, product_id: s.product_id, suggestion: s };
  return make(
    event,
    s.is_urgent ? "suggestedUrgent" : "suggested",
    `${s.is_urgent ? "⚡ " : ""}${E.suggested}: ${nameOf(s.product_id)} (${E.deliveryItem(formatNumber(s.suggested_qty))})`,
    [
      E.suggestedHow(s.supplier.supplier_name, formatDate(s.expected_delivery_date)),
      ...(s.expected_lost_sales_if_skipped >= 1 ? [E.lostIfSkipped(`$${formatNumber(s.expected_lost_sales_if_skipped)}`)] : []),
    ],
    s.product_id,
    s.expected_lost_sales_if_skipped,
    s,
  );
}
