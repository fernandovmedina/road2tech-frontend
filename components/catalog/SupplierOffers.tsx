"use client";

import { useState } from "react";
import { useSupplierOffers } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { t, tList } from "@/lib/labels";
import { formatMoneyExact } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { Supplier } from "@/types";

const O = copy.suppliers.offers;
const PAGE_SIZE = 10;

/** Offers (supplier × product) of one supplier. The parent keys this component by supplier id so filters reset on change. */
export function SupplierOffers({ supplier }: { supplier: Supplier }) {
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");

  const offers = useSupplierOffers(supplier.supplier_id, { page, pageSize: PAGE_SIZE, categoryId: categoryId || undefined, q: q || undefined });
  const data = offers.data;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
        <h2 className="text-lg font-extrabold">{O.title(supplier.supplier_name)}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <SearchField id="offers-search" label={O.search} placeholder={O.searchPlaceholder} onSearch={(v) => { setQ(v); setPage(1); }} className="w-56" />
          <Select
            id="offers-category"
            label={O.category}
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="w-52"
          >
            <option value="">{copy.common.allCategories}</option>
            {supplier.categories_served.map((c) => (
              <option key={c} value={c}>{t("category", c)}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4">
        {offers.isPending ? (
          <div className="flex flex-col gap-2 px-5 pb-5" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11" />)}
          </div>
        ) : offers.isError ? (
          <div className="px-5 pb-5"><ErrorState onRetry={() => offers.refetch()} /></div>
        ) : data && data.items.length === 0 ? (
          <div className="px-5 pb-5"><EmptyState text={O.empty} /></div>
        ) : data ? (
          <>
            <div className={`overflow-x-auto transition-opacity ${offers.isPlaceholderData ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-y border-line text-xs font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">{O.cols.product}</th>
                    <th scope="col" className="py-3 pr-3">{O.cols.category}</th>
                    <th scope="col" className="py-3 pr-3 text-right">{O.cols.cost}</th>
                    <th scope="col" className="py-3 pr-3 text-right">{O.cols.minOrder}</th>
                    <th scope="col" className="py-3 pr-3">{O.cols.leadTime}</th>
                    <th scope="col" className="py-3 pr-3">{O.cols.days}</th>
                    <th scope="col" className="py-3 pr-5 text-right">{O.cols.price}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.product_id} className="border-b border-line last:border-b-0">
                      <td className="px-5 py-3">
                        <span className="block font-bold">{o.product_name}</span>
                        <span className="block text-xs text-muted">{o.product_id}</span>
                      </td>
                      <td className="py-3 pr-3">{t("category", o.category_id)}</td>
                      <td className="py-3 pr-3 text-right font-semibold">{formatMoneyExact(o.unit_cost)}</td>
                      <td className="py-3 pr-3 text-right">{O.minOrderUnits(o.min_order_qty)}</td>
                      <td className="py-3 pr-3">{O.leadTimeDays(o.lead_time_days)}</td>
                      <td className="py-3 pr-3">{tList("weekday", o.delivery_days)}</td>
                      <td className="py-3 pr-5 text-right font-semibold">{formatMoneyExact(o.retail_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} disabled={offers.isPlaceholderData} />
          </>
        ) : null}
      </div>
    </Card>
  );
}
