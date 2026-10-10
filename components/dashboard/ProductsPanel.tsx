"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useCatalog, useMeta, useProducts } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatRate } from "@/lib/format";
import { t } from "@/lib/labels";
import { calendarHref, productHref } from "@/lib/links";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { Product } from "@/types";

const A = copy.dashboard.analysis;
const PAGE = 10;

// Navigation links styled like the standard small buttons (Button renders a <button>, not an <a>).
const smallBtn =
  "inline-flex min-h-10 items-center justify-center rounded-control px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// TODO(backend): the dashboard asks for products "en alza / en baja" with a trend arrow, but no endpoint returns a
// per-product trend. Proposal: GET /products?sort=trend_desc|trend_asc adding `trend_pct` (+ units/day) to each row.
// Until then the list is the catalog (search + category + "Ver más") with the base demand per day.

/** Catalog list for the dashboard side panel: server-side search/category, capped results, "Ver más". */
export function ProductsPanel({ storeId, pinnedProductId }: { storeId: string; pinnedProductId: string | null }) {
  const searchId = useId();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const categories = useMeta().data?.categories ?? [];
  const catalog = useCatalog();
  const { data, isPending, isError, refetch, isFetching } = useProducts({
    page: 1,
    pageSize: limit,
    categoryId: categoryId || undefined,
    q: q || undefined,
  });

  const pinned = pinnedProductId ? catalog.byId.get(pinnedProductId) : undefined;
  const rows: Product[] = data ? (pinned ? [pinned, ...data.items.filter((p) => p.product_id !== pinned.product_id)] : data.items) : [];

  return (
    <div className="flex flex-col gap-3">
      <SearchField
        id={searchId}
        label={A.searchInList}
        placeholder={A.searchInListPlaceholder}
        onSearch={(value) => { setQ(value); setLimit(PAGE); }}
      />
      <Select
        id="category-filter"
        label={copy.common.category}
        value={categoryId}
        onChange={(e) => { setCategoryId(e.target.value); setLimit(PAGE); }}
      >
        <option value="">{copy.common.allCategories}</option>
        {categories.map((c) => (
          <option key={c.category_id} value={c.category_id}>{t("category", c.category_id)}</option>
        ))}
      </Select>

      <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto pr-1" aria-busy={isFetching}>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px]" />)
        ) : rows.length === 0 ? (
          <EmptyState text={A.noRows} />
        ) : (
          rows.map((p) => (
            <div key={p.product_id} className={`rounded-block p-3 ${p.product_id === pinnedProductId ? "bg-accent-tint/40" : "bg-background"}`}>
              <p className="truncate text-sm font-bold">{p.product_name}</p>
              <p className="text-xs text-muted">
                {t("category", p.category_id)} · <span className="tabular-nums">{formatRate(p.base_daily_demand)} {copy.common.perDay}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={productHref(p.product_id, { storeId })} className={`${smallBtn} bg-primary-tint text-primary hover:bg-primary/15`}>{A.trend}</Link>
                <Link href={calendarHref({ productId: p.product_id, storeId })} className={`${smallBtn} border border-line hover:bg-background`}>{copy.common.viewInCalendar}</Link>
              </div>
            </div>
          ))
        )}
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted" aria-live="polite">{A.showing(data.items.length, data.total)}</p>
          {limit < data.total && (
            <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)} disabled={isFetching}>{A.showMore}</Button>
          )}
        </div>
      )}
    </div>
  );
}
