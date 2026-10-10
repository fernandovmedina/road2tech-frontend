import { copy } from "@/lib/copy";
import { formatDecimal, formatMoney, formatPct, formatRate } from "@/lib/format";
import type { Tone } from "@/components/ui/Badge";
import type { Strategy, StrategyStatus } from "@/types";

// Presentation helpers for strategies. They only format values delivered by the backend
// (docs/backend-contract.md section 4); there is no financial calculation here.

type Interval = Strategy["confidence_interval"];

/** `proposed_discount_pct` is a fraction (0.10). One decimal only when it is not a whole percent. */
export function discountLabel(fraction: number): string {
  const pct = fraction * 100;
  return formatPct(fraction, Math.abs(pct - Math.round(pct)) < 0.05 ? 0 : 1);
}

export function signedUnits(v: number): string {
  return `${v >= 0 ? "+" : "−"}${formatRate(Math.abs(v))} ${copy.common.units}`;
}

/** Difference between two fractions (stock-out risk) in percentage points. */
export function signedPoints(diff: number): string {
  return `${diff >= 0 ? "+" : "−"}${formatDecimal(Math.abs(diff * 100))} ${copy.strategy.points}`;
}

/** "Rango $210 a $720 · confianza 80%": the impact is always an estimate with its range. */
export function intervalText(ci: Interval): string {
  return copy.strategy.range(formatMoney(ci.low), formatMoney(ci.high), formatPct(ci.level));
}

export const statusTone: Record<StrategyStatus, Tone> = {
  draft: "gray",
  selected: "blue",
  approved: "green",
  scheduled: "blue",
  active: "green",
  measured: "green",
  expired: "gray",
  rejected: "red",
};

const timestamp = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Backend timestamps (`generated_at`, `measured_at`) as "30 sep, 06:00". Only for display, never to decide past/future. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : timestamp.format(d);
}
