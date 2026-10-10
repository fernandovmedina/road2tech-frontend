"use client";

import type { ReactNode } from "react";
import { useStock } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDate, formatMoneyExact, formatNumber, formatRate } from "@/lib/format";
import { t } from "@/lib/labels";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Product, StockStatus, Tendency } from "@/types";

const M = copy.product.metrics;

const stockTone: Record<StockStatus, Tone> = { out: "red", low: "amber", ok: "green", over: "blue" };

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold tabular-nums">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

/**
 * Product tiles. Price, base demand and shelf life come from the catalog; stock, coverage and expiry come from the
 * store's stock record. Anything the backend does not send is shown as "—" (nothing is estimated here).
 */
export function ProductMetrics({
  product,
  storeId,
  forecast,
}: {
  product: Product;
  storeId: string;
  forecast: Tendency["forecast"] | undefined;
}) {
  const stock = useStock({ storeId, q: product.product_name, pageSize: 25 });
  const item = stock.data?.items.find((i) => i.product_id === product.product_id);
  const pending = stock.isPending;

  return (
    <section aria-label={M.title}>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile label={M.price} value={formatMoneyExact(product.retail_price)} hint={product.unit} />

        {pending ? (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        ) : (
          <>
            <Tile
              label={M.stock}
              value={item ? `${formatNumber(item.closing_qty)} ${copy.common.units}` : M.none}
              hint={
                item ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={stockTone[item.status]}>{t("stockStatus", item.status)}</Badge>
                    {item.on_order_qty > 0 && <span>{M.onOrder(formatNumber(item.on_order_qty))}</span>}
                  </span>
                ) : stock.isError ? (
                  M.stockError
                ) : (
                  M.noStock
                )
              }
            />
            <Tile label={M.coverage} value={item ? M.days(formatRate(item.coverage_days)) : M.none} />
            <Tile
              label={M.expiry}
              value={item?.earliest_expiry ? formatDate(item.earliest_expiry) : M.none}
              hint={
                item && item.expiring_qty_7d > 0
                  ? M.expiringSoon(formatNumber(item.expiring_qty_7d))
                  : M.shelfLife(formatNumber(product.shelf_life_days))
              }
            />
          </>
        )}

        <Tile
          label={M.forecastDemand}
          value={forecast && forecast.length > 0 ? `${formatNumber(forecast.reduce((sum, p) => sum + p.value, 0))} ${copy.common.units}` : M.none}
          hint={forecast && forecast.length > 0 ? M.forecastHint(forecast.length) : undefined}
        />
        <Tile label={M.baseDemand} value={`${formatRate(product.base_daily_demand)} ${copy.common.perDay}`} />
      </dl>
    </section>
  );
}
