"use client";

import type { ReactNode } from "react";
import { useAsOf, useStock, useTendency } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { daysBetween } from "./periodText";
import type { Product, Tendency } from "@/types";

const M = copy.product.metrics;

function Tile({ label, value, hint, tone = "plain" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "plain" | "warm" }) {
  const warm = tone === "warm";
  return (
    <div className={`rounded-xl px-4 py-3 ${warm ? "bg-accent-tint" : "bg-background"}`}>
      <dt className={`text-[11px] font-extrabold uppercase tracking-wide ${warm ? "text-accent-dark" : "text-muted"}`}>{label}</dt>
      <dd className={`mt-1 text-xl font-extrabold tabular-nums ${warm ? "text-accent-dark" : ""}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs font-bold tabular-nums">{hint}</dd>}
    </div>
  );
}

/** Change of the expected demand against the same number of days just lived. `null` when there is nothing to compare. */
function demandChange(history: Tendency["history"], forecast: Tendency["forecast"]): number | null {
  if (forecast.length === 0 || history.length < forecast.length) return null;
  const before = history.slice(-forecast.length).reduce((sum, p) => sum + p.value, 0);
  if (before <= 0) return null;
  const next = forecast.reduce((sum, p) => sum + p.value, 0);
  return ((next - before) / before) * 100;
}

/**
 * Four tiles under the chart: demand for the next days, stock, days to expiry and expected waste. Stock and expiry
 * come from the store's stock record; the demand is the sum of the delivered forecast; the waste comes from the
 * strategy baseline (`expectedWasteUnits`). Anything the backend does not send is shown as "—" (nothing is estimated).
 */
export function ProductMetrics({
  product,
  storeId,
  expectedWasteUnits,
}: {
  product: Product;
  storeId: string;
  /** `baseline.waste_units` of the promotion for this product; null when there is no promotion. */
  expectedWasteUnits: number | null;
}) {
  const tendency = useTendency(storeId, product.product_id).data;
  const asOf = useAsOf();
  const stock = useStock({ storeId, q: product.product_name, pageSize: 25 });
  const item = stock.data?.items.find((i) => i.product_id === product.product_id);

  const forecast = tendency?.forecast ?? [];
  const hasForecast = forecast.length > 0;
  const change = tendency ? demandChange(tendency.history, forecast) : null;

  const daysLeft = item?.earliest_expiry && asOf ? daysBetween(asOf, item.earliest_expiry) : null;
  const expiryText = daysLeft === null ? M.none : daysLeft < 0 ? M.expired : M.daysValue(daysLeft);
  // Expected waste: the promotion's baseline when there is one; otherwise the stock record's own figure. With a stock
  // record and nothing expiring within the forecast window there is no waste: 0, not a dash.
  const expiresBeyondHorizon = !!item && (!item.earliest_expiry || (daysLeft !== null && daysLeft > (forecast.length || 14)));
  const wasteUnits = expectedWasteUnits ?? item?.expected_waste_units ?? (expiresBeyondHorizon ? 0 : null);
  const expirySoon = daysLeft !== null && daysLeft <= 7 && (item?.expiring_qty_7d ?? 0) > 0;

  return (
    <section aria-label={M.title}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label={M.demand(forecast.length || 14)}
          value={hasForecast ? `${formatNumber(forecast.reduce((sum, p) => sum + p.value, 0))} ${copy.common.units}` : M.none}
          hint={
            change === null || Math.round(change) === 0 ? undefined : (
              <span className={change > 0 ? "text-primary" : "text-alert-dark"}>
                <span aria-hidden>{change > 0 ? "▲" : "▼"} </span>
                {formatNumber(Math.abs(change))}%
                <span className="sr-only"> {M.demandVsPrevious(forecast.length)}</span>
              </span>
            )
          }
        />
        {stock.isPending ? (
          <>
            <Skeleton className="h-[74px] rounded-xl" />
            <Skeleton className="h-[74px] rounded-xl" />
          </>
        ) : (
          <>
            <Tile label={M.stock} value={item ? `${formatNumber(item.closing_qty)} ${copy.common.units}` : M.none} />
            <Tile label={M.expiresIn} value={<span className={expirySoon ? "text-alert" : ""}>{expiryText}</span>} />
          </>
        )}
        <Tile
          label={M.expectedWaste}
          value={wasteUnits === null ? M.none : `${formatNumber(wasteUnits)} ${copy.common.units}`}
          tone="warm"
        />
      </dl>
    </section>
  );
}
