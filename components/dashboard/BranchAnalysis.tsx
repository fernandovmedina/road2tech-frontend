"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useBranches, useHeat, useProductRows, useProducts, usePromos, type Scope } from "@/lib/api/hooks";
import { useFilters } from "@/lib/filters";
import { copy } from "@/lib/copy";
import { categories } from "@/lib/mock/seed";
import { formatMoney, formatNumber } from "@/lib/format";
import { calendarHref, productHref } from "@/lib/links";
import { HEAT_STOPS } from "@/lib/heat";
import { promoGain, promoProductId, promoShortLabel } from "@/lib/mock/engine";
import { ProductSearch } from "@/components/map/ProductSearch";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorState } from "@/components/ui/States";

const A = copy.dashboard.analysis;

const BranchMap = dynamic(() => import("@/components/map/BranchMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full rounded-xl" />,
});

const smallBtn = "inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-sm font-semibold transition-colors";

export function BranchAnalysis({ scope }: { scope: Scope }) {
  const branches = useBranches().data ?? [];
  const { setBranch } = useFilters();
  const products = useProducts();
  const [searched, setSearched] = useState<string | null>(null);
  const [tab, setTab] = useState<"products" | "promotions">("products");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"up" | "down">("up");

  const heat = useHeat(searched);
  const rows = useProductRows(scope);
  const promos = usePromos();

  const visibleHeat = (heat.data ?? []).filter((h) => branches.some((b) => b.id === h.branchId));
  const topBranchId = searched && visibleHeat.length ? [...visibleHeat].sort((a, b) => b.movement - a.movement)[0].branchId : null;
  const searchedName = products.data?.find((p) => p.id === searched)?.name;

  const sortedRows = useMemo(() => {
    const list = (rows.data ?? [])
      .filter((r) => category === "all" || products.data?.find((p) => p.id === r.productId)?.category === category)
      .sort((a, b) => (sort === "up" ? b.trendPct - a.trendPct : a.trendPct - b.trendPct));
    if (searched && scope.branchId !== "all") {
      const i = list.findIndex((r) => r.productId === searched);
      if (i > 0) list.unshift(...list.splice(i, 1));
    }
    return list;
  }, [rows.data, products.data, category, sort, searched, scope.branchId]);

  const promoList = (promos.data ?? [])
    .filter((p) => p.status !== "dismissed" && (scope.branchId === "all" || p.branchId === scope.branchId))
    .sort((a, b) => promoGain(b) - promoGain(a));

  return (
    <section aria-labelledby="analysis-title">
      <h2 id="analysis-title" className="mb-3 text-lg font-extrabold">{A.title}</h2>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-base font-extrabold">{A.mapTitle}</h3>
            <div className="flex flex-wrap items-end gap-2">
              <ProductSearch onSelect={setSearched} />
              {searched && (
                <button
                  type="button"
                  onClick={() => setSearched(null)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/40 bg-accent-tint px-3 text-sm font-bold text-accent-dark"
                >
                  {searchedName} · {A.clearFilter} <span aria-hidden>×</span>
                </button>
              )}
            </div>
          </div>
          {heat.isError ? (
            <ErrorState onRetry={() => heat.refetch()} />
          ) : (
            <div className="overflow-hidden rounded-xl">
              <BranchMap branches={branches} heat={visibleHeat} selectedId={scope.branchId} topBranchId={topBranchId} onSelect={setBranch} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted">
            <span className="flex items-center gap-2">
              {A.legendLow}
              <span aria-hidden className="h-2.5 w-36 rounded-full" style={{ background: `linear-gradient(90deg, ${HEAT_STOPS.join(",")})` }} />
              {A.legendHigh}
            </span>
            {topBranchId && <span>★ {A.topBranch}: {branches.find((b) => b.id === topBranchId)?.name}</span>}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <Tabs
            label={A.title}
            value={tab}
            onChange={setTab}
            tabs={[{ id: "products", label: A.tabs.products }, { id: "promotions", label: A.tabs.promotions }]}
          />

          {tab === "products" ? (
            <>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.common.category}>
                {["all", ...categories].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                    className={`min-h-9 rounded-full px-3 text-xs font-bold ${category === c ? "bg-primary text-white" : "bg-background text-muted hover:text-foreground"}`}
                  >
                    {c === "all" ? copy.common.allCategories : c}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="sort-rows" className="text-xs font-semibold text-muted">{A.sort}</label>
                <select
                  id="sort-rows"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "up" | "down")}
                  className="min-h-10 rounded-[10px] border border-line bg-white px-2 text-sm font-medium"
                >
                  <option value="up">{A.sortUp}</option>
                  <option value="down">{A.sortDown}</option>
                </select>
              </div>
              <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto pr-1">
                {rows.isError ? (
                  <ErrorState onRetry={() => rows.refetch()} />
                ) : rows.isPending || products.isPending ? (
                  [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px]" />)
                ) : sortedRows.length === 0 ? (
                  <EmptyState text={A.noRows} />
                ) : (
                  sortedRows.map((r) => {
                    const p = products.data?.find((x) => x.id === r.productId);
                    const up = r.trendPct >= 0;
                    return (
                      <div key={r.productId} className={`rounded-xl border p-3 ${r.productId === searched ? "border-accent bg-accent-tint/40" : "border-line"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{p?.name}</p>
                            <p className="text-xs text-muted">{formatNumber(r.unitsPerDay)} {copy.common.perDay}</p>
                          </div>
                          <span className={`text-sm font-extrabold ${up ? "text-primary" : "text-alert"}`}>
                            <span aria-hidden>{up ? "▲" : "▼"}</span> {Math.abs(r.trendPct)}%
                            <span className="sr-only">{up ? " en alza" : " en baja"}</span>
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link href={productHref(r.productId)} className={`${smallBtn} bg-primary-tint text-primary hover:bg-primary/15`}>{A.trend}</Link>
                          <Link href={calendarHref({ productId: r.productId })} className={`${smallBtn} border border-line hover:bg-background`}>{copy.common.viewInCalendar}</Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex max-h-[470px] flex-col gap-2 overflow-y-auto pr-1">
              {promos.isError ? (
                <ErrorState onRetry={() => promos.refetch()} />
              ) : promos.isPending ? (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px]" />)
              ) : promoList.length === 0 ? (
                <EmptyState text={A.noPromos} />
              ) : (
                promoList.map((p) => (
                  <Link key={p.id} href={productHref(promoProductId(p), p.id)} className="rounded-xl border border-line p-3 transition-colors hover:border-accent hover:bg-accent-tint/40">
                    <p className="text-sm font-bold leading-snug">{p.title}</p>
                    <p className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span>{promoShortLabel(p)} · {p.status === "accepted" ? "✓" : "IA"}</span>
                      <span className="text-sm font-extrabold text-primary">{A.gain} +{formatMoney(promoGain(p))}</span>
                    </p>
                  </Link>
                ))
              )}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
