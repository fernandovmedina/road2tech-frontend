"use client";

import { Boxes, Hourglass, Trash2, TrendingUp } from "lucide-react";
import { useAsOf, useStock, useTendency } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { Kpi } from "@/components/ui/Kpi";
import { Skeleton } from "@/components/ui/Skeleton";
import { daysBetween } from "./periodText";
import type { Product, Tendency } from "@/types";

const M = copy.product.metrics;

/** Change of the expected demand against the same number of days just lived. `null` when there is nothing to compare. */
function demandChange(history: Tendency["history"], forecast: Tendency["forecast"]): number | null {
  if (forecast.length === 0 || history.length < forecast.length) return null;
  const before = history.slice(-forecast.length).reduce((sum, p) => sum + p.value, 0);
  if (before <= 0) return null;
  const next = forecast.reduce((sum, p) => sum + p.value, 0);
  return ((next - before) / before) * 100;
}

/**
 * KPI row under the chart: demand for the next days, stock, days to expiry and expected waste. Stock and expiry
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
  const hasChange = change !== null && Math.round(change) !== 0;

  return (
    <section aria-label={M.title} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi
        label={M.demand(forecast.length || 14)}
        value={hasForecast ? `${formatNumber(forecast.reduce((sum, p) => sum + p.value, 0))} ${copy.common.units}` : M.none}
        icon={TrendingUp}
        tone="primary"
        delta={
          hasChange
            ? {
                value: `${change > 0 ? "▲" : "▼"} ${formatNumber(Math.abs(change))}%`,
                positive: change > 0,
              }
            : undefined
        }
        caption={hasChange ? M.demandVsPrevious(forecast.length) : undefined}
      />
      {stock.isPending ? (
        <>
          <Skeleton className="h-[112px] rounded-card" />
          <Skeleton className="h-[112px] rounded-card" />
        </>
      ) : (
        <>
          <Kpi
            label={M.stock}
            value={item ? `${formatNumber(item.closing_qty)} ${copy.common.units}` : M.none}
            icon={Boxes}
            tone="info"
          />
          <Kpi
            label={M.expiresIn}
            value={expiryText}
            icon={Hourglass}
            tone="neutral"
            valueTone={expirySoon ? "text-alert" : undefined}
          />
        </>
      )}
      <Kpi
        label={M.expectedWaste}
        value={wasteUnits === null ? M.none : `${formatNumber(wasteUnits)} ${copy.common.units}`}
        icon={Trash2}
        tone="accent"
      />
    </section>
  );
}
