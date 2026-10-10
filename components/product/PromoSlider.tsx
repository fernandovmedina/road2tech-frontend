"use client";

import { useId } from "react";
import { useCatalog } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatPct } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StrategyReasons } from "./StrategyReasons";
import { periodLabel } from "./periodText";
import { isAdjustable, sliderMaxPct, toFraction, toWholePct } from "./promoCurve";
import type { StrategyDetail } from "@/types";

const P = copy.product.promo;

/**
 * "Promoción sugerida" card: headline, week and store, the discount slider (0 to the allowed maximum, 1% steps), the
 * optimal discount of the model and the short reasons. `discount` is a fraction; the slider only picks a point of the
 * delivered curve. When the strategy can no longer change, the slider stays visible but disabled, with a short note.
 */
export function PromoSlider({
  strategy,
  storeName,
  discount,
  onDiscount,
}: {
  strategy: StrategyDetail;
  storeName: string;
  discount: number;
  onDiscount: (fraction: number) => void;
}) {
  const sliderId = useId();
  const { nameOf } = useCatalog();
  const editable = isAdjustable(strategy);
  const max = sliderMaxPct(strategy);
  const value = Math.min(toWholePct(discount), max);
  const optimal = Math.min(toWholePct(strategy.optimal_discount_pct), max);
  const shown = formatPct(toFraction(value));
  const optimalShown = formatPct(toFraction(optimal));
  const anchor = strategy.anchor_product_id ? nameOf(strategy.anchor_product_id) : null;

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <h2 className="text-lg font-bold">{P.title}</h2>
        <Badge tone="green"><span aria-hidden>✦&nbsp;</span>{P.badge}</Badge>
      </div>

      <div className="rounded-block bg-background px-4 py-3">
        <p className="text-sm font-bold leading-snug">{P.headline(nameOf(strategy.promoted_product_id), shown, anchor)}</p>
        <p className="mt-0.5 text-xs text-muted">
          {periodLabel(strategy.period.start_date, strategy.period.end_date)} · {storeName}
        </p>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor={sliderId} className="text-sm font-bold">{P.discount}</label>
          <output htmlFor={sliderId} className="text-2xl font-bold tracking-tight tabular-nums">{shown}</output>
        </div>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onDiscount(toFraction(Number(e.target.value)))}
          aria-valuetext={P.valueText(shown)}
          disabled={!editable}
          className="h-11 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span aria-hidden>0%</span>
          {editable && value !== optimal ? (
            <button
              type="button"
              onClick={() => onDiscount(toFraction(optimal))}
              aria-label={P.applyOptimal(optimalShown)}
              className="inline-flex min-h-11 items-center rounded-control px-2 hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {P.optimal}<strong className="ml-1 text-primary underline">{optimalShown}</strong>
            </button>
          ) : (
            <span>
              {P.optimal}<strong className="ml-1 text-primary">{optimalShown}</strong>
            </span>
          )}
          <span aria-hidden>{max}%</span>
        </div>
        {!editable && <p className="mt-2 text-xs font-semibold text-muted">{P.appliedNote(shown)}</p>}
      </div>

      <StrategyReasons strategy={strategy} />
    </Card>
  );
}
