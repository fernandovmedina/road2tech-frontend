import { copy } from "@/lib/copy";
import { formatDate, formatDecimal, formatMoney, formatPct, formatRate } from "@/lib/format";
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

export type RiskLevel = "low" | "medium" | "high";

/** Presentation label only (thresholds for the words Bajo / Medio / Alto); the risk itself comes from the backend. */
export function riskLevel(risk: number): RiskLevel {
  if (risk < 0.15) return "low";
  if (risk < 0.4) return "medium";
  return "high";
}

export const riskTone: Record<RiskLevel, string> = {
  low: "text-primary",
  medium: "text-warning-dark",
  high: "text-alert-dark",
};

/** A strategy the engine could not recommend: it broke a business limit, so it carries no gain figures. */
export const isBlockedByConstraint = (s: Strategy): boolean => !s.constraints.satisfied || s.constraints.violations.length > 0;

/** One plain sentence on why a strategy is not recommended ("No se recomienda: se agotaría el stock"). */
export function notRecommendedText(s: Strategy): string {
  const N = copy.strategy.promo.notRecommended;
  const known: Record<string, string> = N.codes;
  for (const v of s.constraints.violations) if (known[v.code]) return known[v.code];
  if (isBlockedByConstraint(s)) return N.fallback;
  return s.status === "expired" ? N.expired : N.discarded;
}

/**
 * One readable line: "Yogurt: −10% del 2 oct al 5 oct" or "Pan + Leche: −10% en Leche, del 2 oct al 5 oct".
 * Falls back to the backend title until the catalog (product names) has loaded.
 */
export function promoTitle(s: Strategy, nameOf: (id: string) => string, catalogReady: boolean): string {
  if (!catalogReady) return s.title;
  const P = copy.strategy.promo;
  const discount = discountLabel(s.proposed_discount_pct);
  const dates = P.dates(formatDate(s.period.start_date), formatDate(s.period.end_date));
  if (s.anchor_product_id) {
    return `${P.comboTitle(nameOf(s.anchor_product_id), nameOf(s.promoted_product_id), discount)}, ${dates}`;
  }
  return `${P.title(nameOf(s.promoted_product_id), discount)} ${dates}`;
}
