"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBranches, useProducts, useStock } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { categories } from "@/lib/mock/seed";
import { formatDate, formatNumber } from "@/lib/format";
import { calendarHref } from "@/lib/links";
import { PageHeader } from "@/components/layout/PageHeader";
import { BranchSelect, useEffectiveBranch } from "@/components/layout/BranchSelect";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useFilters } from "@/lib/filters";
import type { Product, StockItem, StockStatus } from "@/types";

const S = copy.stock;
const statuses: StockStatus[] = ["out", "low", "ok", "over"];
const statusTone: Record<StockStatus, Tone> = { out: "red", low: "amber", ok: "green", over: "blue" };
const statusBar: Record<StockStatus, string> = { out: "bg-alert", low: "bg-[#E8A100]", ok: "bg-primary", over: "bg-info" };
const cardTone: Record<StockStatus, string> = { out: "text-alert", low: "text-[#B07800]", ok: "text-primary", over: "text-info" };

export function StockView() {
  const branchId = useEffectiveBranch();
  const setBranch = useFilters((s) => s.setBranch);
  const stock = useStock(branchId);
  const products = useProducts();
  const branches = useBranches();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StockStatus | "all">("all");

  const productMap = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const branchName = (id: string) => branches.data?.find((b) => b.id === id)?.name ?? id;

  // Status is derived from the product catalog min/max so catalog edits show up here.
  const base = useMemo(() => {
    return (stock.data ?? [])
      .map((i) => {
        const p = productMap.get(i.productId);
        return p ? { item: i, product: p, status: statusFor(i, p) } : null;
      })
      .filter((x): x is { item: StockItem; product: Product; status: StockStatus } => !!x)
      .filter((x) => category === "all" || x.product.category === category);
  }, [stock.data, productMap, category]);

  const counts = statuses.map((s) => base.filter((x) => x.status === s).length);
  const rows = base.filter((x) => status === "all" || x.status === status);
  const loading = stock.isPending || products.isPending;
  const error = stock.isError || products.isError;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={S.title} subtitle={S.subtitle}>
        <BranchSelect id="stock-branch" />
        <Select id="stock-category" label={copy.common.category} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">{copy.common.allCategories}</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </PageHeader>

      {error ? (
        <ErrorState onRetry={() => { stock.refetch(); products.refetch(); }} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {statuses.map((s, i) => (
              <Card key={s}>
                <p className="text-sm font-semibold text-muted">{S.status[s]}</p>
                {loading ? <Skeleton className="mt-2 h-9 w-16" /> : <p className={`mt-2 text-[32px] font-extrabold leading-none ${cardTone[s]}`}>{counts[i]}</p>}
              </Card>
            ))}
          </div>

          <div role="group" aria-label={S.cols.status} className="flex flex-wrap gap-2">
            {(["all", ...statuses] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`min-h-10 rounded-full px-4 text-sm font-bold ${status === s ? "bg-primary text-white" : "border border-line bg-white text-muted hover:text-foreground"}`}
              >
                {s === "all" ? copy.common.allCategories : S.status[s]}
              </button>
            ))}
          </div>

          <Card className="overflow-x-auto p-0">
            {loading ? (
              <div className="flex flex-col gap-2 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : rows.length === 0 ? (
              <EmptyState
                className="m-5"
                text={S.emptyFiltered}
                action={<Button variant="secondary" size="sm" onClick={() => { setStatus("all"); setCategory("all"); setBranch("all"); }}>{copy.common.clearFilters}</Button>}
              />
            ) : (
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted">
                    <th className="px-5 py-3">{S.cols.product}</th>
                    {branchId === "all" && <th className="py-3 pr-3">{S.cols.branch}</th>}
                    <th className="py-3 pr-3 text-right">{S.cols.existence}</th>
                    <th className="w-56 py-3 pr-3">{S.cols.level}</th>
                    <th className="py-3 pr-3">{S.cols.coverage}</th>
                    <th className="py-3 pr-3">{S.cols.status}</th>
                    <th className="py-3 pr-3">{S.cols.nextRestock}</th>
                    <th className="py-3 pr-5"><span className="sr-only">{copy.common.viewInCalendar}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ item, product, status: st }) => {
                    const scaleMax = Math.max(product.maxStock * 1.5, item.quantity, 1);
                    return (
                      <tr key={`${item.productId}-${item.branchId}`} className="border-b border-line last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-bold">{product.name}</p>
                          <p className="text-xs text-muted">{product.category}</p>
                        </td>
                        {branchId === "all" && <td className="py-3 pr-3">{branchName(item.branchId)}</td>}
                        <td className="py-3 pr-3 text-right font-bold">{formatNumber(item.quantity)}</td>
                        <td className="py-3 pr-3">
                          <div
                            className="relative h-2.5 rounded-full bg-[#EEF1F0]"
                            role="img"
                            aria-label={`${formatNumber(item.quantity)} · ${S.min} ${product.minStock} · ${S.max} ${product.maxStock}`}
                          >
                            <div className={`h-full rounded-full ${statusBar[st]}`} style={{ width: `${Math.min(100, (item.quantity / scaleMax) * 100)}%` }} />
                            <span aria-hidden className="absolute -top-1 h-4.5 w-0.5 bg-foreground/70" style={{ left: `${(product.minStock / scaleMax) * 100}%`, height: 18 }} />
                            <span aria-hidden className="absolute -top-1 w-0.5 bg-foreground/70" style={{ left: `${(product.maxStock / scaleMax) * 100}%`, height: 18 }} />
                          </div>
                          <p className="mt-1 text-[11px] text-muted">{S.min} {product.minStock} · {S.max} {product.maxStock}</p>
                        </td>
                        <td className="py-3 pr-3">{S.coverageDays(item.coverageDays)}</td>
                        <td className="py-3 pr-3"><Badge tone={statusTone[st]}>{S.status[st]}</Badge></td>
                        <td className="py-3 pr-3">{item.nextRestock ? formatDate(item.nextRestock) : S.none}</td>
                        <td className="py-3 pr-5 text-right">
                          <Link
                            href={calendarHref({ productId: item.productId, branchId: item.branchId, date: item.nextRestock ?? undefined })}
                            className="inline-flex min-h-10 items-center rounded-[10px] border border-line px-3 text-sm font-semibold hover:bg-background"
                          >
                            {copy.common.viewInCalendar}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function statusFor(i: StockItem, p: Product): StockStatus {
  if (i.quantity <= 0) return "out";
  if (i.quantity < p.minStock) return "low";
  if (i.quantity > p.maxStock) return "over";
  return "ok";
}
