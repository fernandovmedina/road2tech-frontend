import type { DiscountPoint, Strategy, StrategyDetail, StrategyStatus, Tendency } from "@/types";

// Helpers for the promotion detail. The backend delivers one point per discount (the "discount curve"); the slider only
// chooses a point. Nothing here computes money: points are looked up, never calculated.

/** Highest discount the slider can offer, in whole percent (business rule of the product). */
export const SLIDER_HARD_MAX_PCT = 40;

/** Only drafts and plan entries can still change their discount. */
const isEditable = (status: StrategyStatus): boolean => status === "draft" || status === "selected";

/** The slider works only on strategies that can still change and that came with a discount curve. */
export const isAdjustable = (s: StrategyDetail): boolean => isEditable(s.status) && s.discount_curve.length > 0;

/** Fraction (0.12) to whole percent (12), safe against floating point noise (0.07 * 100 = 7.000000000000001). */
export const toWholePct = (fraction: number): number => Math.round(fraction * 100);

/** Whole percent back to the fraction the API uses. */
export const toFraction = (wholePct: number): number => Math.round(wholePct) / 100;

/** Slider upper limit in whole percent: the product cap, the constraint and the end of the curve, whichever is lowest. */
export function sliderMaxPct(s: StrategyDetail): number {
  const caps = [SLIDER_HARD_MAX_PCT];
  if (s.constraints.max_discount_pct !== null) caps.push(toWholePct(s.constraints.max_discount_pct));
  if (s.discount_curve.length > 0) caps.push(toWholePct(Math.max(...s.discount_curve.map((p) => p.discount_pct))));
  return Math.max(0, Math.min(...caps));
}

/** The curve point whose discount is closest to `discount` (both fractions). */
export function nearestPoint(curve: DiscountPoint[], discount: number): DiscountPoint | null {
  let best: DiscountPoint | null = null;
  for (const p of curve) {
    if (best === null || Math.abs(p.discount_pct - discount) < Math.abs(best.discount_pct - discount)) best = p;
  }
  return best;
}

/** The figures a strategy already carries, shaped like a curve point (used when it is no longer editable or has no curve). */
export function pointFromStrategy(s: Strategy): DiscountPoint {
  return {
    discount_pct: s.proposed_discount_pct,
    treated: s.treated,
    expected_units_increment: s.expected_units_increment,
    expected_sales_increment: s.expected_sales_increment,
    expected_margin_increment: s.expected_margin_increment,
    expected_waste_reduction: s.expected_waste_reduction,
    confidence_interval: s.confidence_interval,
  };
}

/**
 * Figures shown for the chosen discount. Adjustable strategies read the curve; applied ones (approved, rejected,
 * expired...) always show their own delivered figures, which is what was really applied.
 */
export function figuresAt(s: StrategyDetail, discount: number): DiscountPoint {
  return (isAdjustable(s) ? nearestPoint(s.discount_curve, discount) : null) ?? pointFromStrategy(s);
}

/**
 * Visual-only proportion for the orange chart series: how big the extra units of the chosen discount are compared with
 * the extra units of the discount the delivered series was built for (`proposed_discount_pct`).
 * `null` means "draw the series exactly as delivered".
 * TODO(backend): send the treated series per discount if the chart needs exact values instead of this proportion.
 */
export function treatedRatio(s: StrategyDetail, chosen: DiscountPoint): number | null {
  if (!isAdjustable(s)) return null;
  const reference = nearestPoint(s.discount_curve, s.proposed_discount_pct);
  if (!reference || reference.expected_units_increment <= 0) return null;
  return Math.max(0, chosen.expected_units_increment / reference.expected_units_increment);
}

/**
 * Re-draws the delivered treated series for another discount: keeps the baseline forecast and scales only the extra
 * demand on top of it by `ratio`. Presentation only; it never feeds a number shown as money or units.
 */
export function scaleTreated(
  forecast: Tendency["forecast"],
  treated: Tendency["treated"],
  ratio: number | null,
): Tendency["treated"] {
  if (!treated || ratio === null || ratio === 1) return treated;
  const base = new Map(forecast.map((p) => [p.date, p.value]));
  return treated.map((p) => {
    const f = base.get(p.date);
    return f === undefined ? p : { date: p.date, value: f + (p.value - f) * ratio };
  });
}
