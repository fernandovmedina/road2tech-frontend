import { copy } from "@/lib/copy";
import { formatDate, formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import type { CalendarEvent } from "@/types";

const E = copy.calendar.events;

export type EventKind = CalendarEvent["kind"];

export type DescribedEvent = {
  event: CalendarEvent;
  kind: EventKind;
  label: string;
  details: string[];
  /** Product the event is about (strategy events do not carry one). */
  productId: string | null;
};

// Green = deliveries, orange = strategies, red = alerts.
export const kindChip: Record<EventKind, string> = {
  delivery: "bg-primary-tint text-primary border-primary/30",
  strategy: "bg-accent-tint text-accent-dark border-accent/30",
  alert: "bg-alert-tint text-alert-dark border-alert/30",
};
export const kindDot: Record<EventKind, string> = {
  delivery: "bg-primary",
  strategy: "bg-accent",
  alert: "bg-alert",
};

export function describeEvent(
  event: CalendarEvent,
  nameOf: (productId: string) => string,
  strategyTitleOf: (strategyId: string) => string | undefined,
): DescribedEvent {
  switch (event.kind) {
    case "delivery":
      return {
        event,
        kind: "delivery",
        label: `${E.delivery}: ${nameOf(event.product_id)} (${E.deliveryItem(formatNumber(event.qty))})`,
        details: [event.order_id],
        productId: event.product_id,
      };
    case "strategy":
      return {
        event,
        kind: "strategy",
        label: `${E.strategy}: ${strategyTitleOf(event.strategy_id) ?? t("strategyType", event.strategy_type)}`,
        details: [
          t("strategyStatus", event.status),
          `${formatDate(event.start_date)} – ${formatDate(event.end_date)}`,
        ],
        productId: null,
      };
    case "alert": {
      const details: string[] = [];
      if (event.severity) details.push(E.severity[event.severity as keyof typeof E.severity] ?? event.severity);
      if (event.alert_type === "expiring_soon" && event.qty !== undefined) details.push(E.expiringQty(formatNumber(event.qty)));
      if (event.delay_days !== undefined) details.push(E.delayDays(event.delay_days));
      if (event.expected_delivery_date) details.push(E.expectedOn(formatDate(event.expected_delivery_date)));
      return {
        event,
        kind: "alert",
        label: `${E.alerts[event.alert_type]}: ${nameOf(event.product_id)}`,
        details,
        productId: event.product_id,
      };
    }
  }
}
