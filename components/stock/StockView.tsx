"use client";

import { useEffect, useState } from "react";
import { useMeta, useStock, useStockSummary, useStores, type StockParams } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/labels";
import { PageHeader } from "@/components/layout/PageHeader";
import { BranchSelect, useEffectiveBranch } from "@/components/layout/BranchSelect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { StockStatus } from "@/types";
import { StockPager } from "./StockPager";
import { StockSummaryCards } from "./StockSummaryCards";
import { StockTable } from "./StockTable";
import { STOCK_STATUSES } from "./statusStyles";

const S = copy.stock;
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

type SortKey = NonNullable<StockParams["sort"]>;
const SORT_KEYS: SortKey[] = ["coverage_days", "quantity", "product_name"];

export function StockView() {
  const branchId = useEffectiveBranch();
  const meta = useMeta();
  const stores = useStores();

  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("coverage_days");

  // Debounced product search: the server filters, we only avoid a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  // The page resets to 1 whenever any filter changes (the page is tagged with the filters it belongs to).
  const filterKey = [branchId, status, categoryId, q, sort].join("|");
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const common = { storeId: branchId, categoryId: categoryId === "all" ? undefined : categoryId, q: q || undefined };
  const stock = useStock({ ...common, status: status === "all" ? undefined : status, sort, page, pageSize: PAGE_SIZE });
  const summary = useStockSummary(common);

  const branchName = (storeId: string) => {
    const store = stores.data?.find((s) => s.store_id === storeId);
    return store ? displayBranchName(store) : storeId;
  };

  const clearFilters = () => {
    setStatus("all");
    setCategoryId("all");
    setSearch("");
    setQ("");
  };
  const hasFilters = status !== "all" || categoryId !== "all" || q !== "";

  const items = stock.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={S.title} subtitle={S.subtitle}>
        <BranchSelect id="stock-branch" includeAll />
        <Select id="stock-category" label={copy.common.category} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="min-w-48">
          <option value="all">{copy.common.allCategories}</option>
          {(meta.data?.categories ?? []).map((c) => (
            <option key={c.category_id} value={c.category_id}>{t("category", c.category_id)}</option>
          ))}
        </Select>
      </PageHeader>

      <StockSummaryCards summary={summary.data} loading={summary.isPending} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div role="group" aria-label={S.filterStatus} className="flex flex-wrap gap-2">
          {(["all", ...STOCK_STATUSES] as const).map((s) => {
            const count = s === "all" ? summary.data?.total : summary.data?.[s];
            return (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`min-h-11 rounded-full px-4 text-sm font-bold ${status === s ? "bg-foreground text-white" : "border border-line bg-card text-muted hover:text-foreground"}`}
              >
                {s === "all" ? S.allStatuses : t("stockStatus", s)}
                {count !== undefined && <span className="ml-1.5 font-semibold opacity-80">{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field
            id="stock-search"
            type="search"
            label={S.search}
            placeholder={S.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Select id="stock-sort" label={S.sortBy} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="min-w-48">
            {SORT_KEYS.map((k) => <option key={k} value={k}>{S.sort[k]}</option>)}
          </Select>
        </div>
      </div>

      {stock.isError ? (
        <ErrorState onRetry={() => { stock.refetch(); summary.refetch(); }} />
      ) : (
        <Card className="p-0">
          {stock.isPending ? (
            <div className="flex flex-col gap-2 p-5" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              className="m-5"
              text={S.emptyFiltered}
              action={
                hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}>{copy.common.clearFilters}</Button> : undefined
              }
            />
          ) : (
            <div aria-busy={stock.isPlaceholderData} className={stock.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <StockTable items={items} showBranch={branchId === "all"} branchName={branchName} />
              <StockPager page={page} pageSize={PAGE_SIZE} total={stock.data?.total ?? 0} onChange={setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
