"use client";

import Link from "next/link";
import { useState } from "react";
import { nextDeliveryDate, promoGain } from "@/lib/mock/engine";
import { useBranches, useProducts, usePromos, useRestockSuggestions, useSuppliers } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatDate, formatMoney, formatNumber, formatPct } from "@/lib/format";
import { productHref } from "@/lib/links";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { RestockSuggestion } from "@/types";

const C = copy.calendar;

export function CalendarSidebar({ branchId, onOrder }: { branchId: string | "all"; onOrder: (s: RestockSuggestion) => void }) {
  const [tab, setTab] = useState<"products" | "suppliers">("products");
  const suggestions = useRestockSuggestions(branchId);
  const products = useProducts();
  const suppliers = useSuppliers();
  const promos = usePromos();
  const branches = useBranches();

  const pName = (id: string) => products.data?.find((p) => p.id === id)?.name ?? id;
  const sName = (id: string) => suppliers.data?.find((s) => s.id === id)?.name ?? id;
  const loading = suggestions.isPending || products.isPending || suppliers.isPending;
  const error = suggestions.isError || products.isError || suppliers.isError;

  const topPromos = (promos.data ?? [])
    .filter((p) => p.status !== "dismissed" && (branchId === "all" || p.branchId === branchId))
    .sort((a, b) => promoGain(b) - promoGain(a))
    .slice(0, 3);

  return (
    <Card className="flex flex-col gap-4">
      <Tabs label={C.title} value={tab} onChange={setTab} tabs={[{ id: "products", label: C.tabs.products }, { id: "suppliers", label: C.tabs.suppliers }]} />

      {error ? (
        <ErrorState onRetry={() => { suggestions.refetch(); products.refetch(); suppliers.refetch(); }} />
      ) : loading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : tab === "products" ? (
        <div className="flex flex-col gap-3">
          {suggestions.data.length === 0 ? (
            <EmptyState text={C.nothingToRestock} />
          ) : (
            suggestions.data.slice(0, 8).map((s) => (
              <div key={s.id} className="rounded-xl border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-snug">{pName(s.productId)}</p>
                  <div className="flex flex-wrap justify-end gap-1">
                    {s.reasons.map((r) => (
                      <Badge key={r} tone={r === "stockout" ? "red" : r === "demand_spike" ? "blue" : "amber"}>{C.tags[r]}</Badge>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {C.suggestedQty}: <strong className="text-foreground">{formatNumber(s.suggestedQty)} {copy.common.units}</strong> · {sName(s.supplierId)}
                  {branchId === "all" && <> · {branches.data?.find((b) => b.id === s.branchId)?.name}</>}
                </p>
                <Button size="sm" className="mt-2" onClick={() => onOrder(s)}>{C.orderBtn}</Button>
              </div>
            ))
          )}

          {topPromos.length > 0 && (
            <div>
              <h3 className="mb-2 mt-1 text-sm font-extrabold">{C.topPromos}</h3>
              <div className="flex flex-col gap-2">
                {topPromos.map((p) => (
                  <Link key={p.id} href={productHref(p.productId, p.id)} className="rounded-xl border border-accent/30 bg-accent-tint/50 p-3 hover:border-accent">
                    <p className="text-sm font-bold leading-snug">{p.title}</p>
                    <p className="mt-1 flex justify-between text-xs text-muted">
                      <span>{formatDate(p.startDate)} · −{p.discountPct}%{p.status === "accepted" ? " ✓" : ""}</span>
                      <span className="font-extrabold text-primary">+{formatMoney(promoGain(p))}</span>
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(suppliers.data ?? []).map((s) => {
            const count = suggestions.data.filter((x) => x.supplierId === s.id).length;
            return (
              <div key={s.id} className="rounded-xl border border-line p-3">
                <p className="text-sm font-bold">{s.name}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><dt className="text-muted">{C.leadTime}</dt><dd className="font-semibold">{s.leadTimeDays} {C.days}</dd></div>
                  <div><dt className="text-muted">{C.deliveryDays}</dt><dd className="font-semibold">{s.deliveryDays}</dd></div>
                  <div><dt className="text-muted">{C.minOrder}</dt><dd className="font-semibold">{formatMoney(s.minOrderValue)}</dd></div>
                  <div><dt className="text-muted">{C.fillRate}</dt><dd className="font-semibold">{formatPct(s.fillRate)}</dd></div>
                  <div><dt className="text-muted">{C.nextDelivery}</dt><dd className="font-semibold">{formatDate(nextDeliveryDate(s))}</dd></div>
                  <div><dt className="text-muted">{C.itemsToOrder}</dt><dd className="font-semibold">{count}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
