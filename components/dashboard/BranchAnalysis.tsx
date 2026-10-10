"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useCatalog, useHeat, useMeta, useStores, type Scope } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { HEAT_STOPS } from "@/lib/heat";
import { t } from "@/lib/labels";
import { ProductSearch } from "@/components/map/ProductSearch";
import { StoreInfo } from "@/components/map/StoreInfo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { StoreRanking } from "./StoreRanking";
import { StoreSidePanel } from "./StoreSidePanel";

const A = copy.dashboard.analysis;

const BranchMap = dynamic(() => import("@/components/map/BranchMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full rounded-xl" />,
});

/** Map (all 25 stores, heat by movement) + side column: ranking in the chain view, products/promotions per store. */
export function BranchAnalysis({ scope }: { scope: Scope }) {
  const { branchId, mode, range } = scope;
  const setBranch = useFilters((s) => s.setBranch);
  const stores = useStores();
  const zones = useMeta().data?.zones ?? [];
  const catalog = useCatalog();

  const [searched, setSearched] = useState<string | null>(null);
  const [zone, setZone] = useState("");

  const heat = useHeat({ mode, range }, { productId: searched, zone: zone || undefined });

  const storeList = stores.data;
  const zoneStoreIds = useMemo(
    () => (zone && storeList ? new Set(storeList.filter((s) => s.zone_type === zone).map((s) => s.store_id)) : null),
    [zone, storeList],
  );

  const selectedStore = branchId === "all" ? undefined : storeList?.find((s) => s.store_id === branchId);
  const selectedMovement = heat.data?.items.find((h) => h.store_id === branchId)?.movement;
  const topStore = searched ? storeList?.find((s) => s.store_id === heat.data?.items.find((h) => h.is_top)?.store_id) : undefined;

  return (
    <section aria-labelledby="analysis-title">
      <h2 id="analysis-title" className="mb-3 text-lg font-extrabold">{A.title}</h2>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-base font-extrabold">{A.mapTitle}</h3>
            <div className="flex flex-wrap items-end gap-2">
              <Select id="zone-filter" label={A.zone} value={zone} onChange={(e) => setZone(e.target.value)}>
                <option value="">{A.allZones}</option>
                {zones.map((z) => (
                  <option key={z.zone_type} value={z.zone_type}>{t("zone", z.zone_type)}</option>
                ))}
              </Select>
              <ProductSearch key={searched ?? "none"} onSelect={setSearched} />
              {searched && (
                <button
                  type="button"
                  onClick={() => setSearched(null)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/40 bg-accent-tint px-3 text-sm font-bold text-accent-dark"
                >
                  {catalog.nameOf(searched)} · {A.clearFilter} <span aria-hidden>×</span>
                </button>
              )}
            </div>
          </div>

          {stores.isError ? (
            <ErrorState onRetry={() => stores.refetch()} />
          ) : !storeList ? (
            <Skeleton className="h-[380px] w-full rounded-xl" />
          ) : storeList.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {heat.isError && (
                <div role="alert" className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-alert/30 bg-alert-tint px-3 py-2 text-sm text-alert-dark">
                  <span>{copy.common.errorTitle}</span>
                  <Button variant="danger" size="sm" onClick={() => heat.refetch()}>{copy.common.retry}</Button>
                </div>
              )}
              <div className="overflow-hidden rounded-xl" aria-busy={heat.isPending}>
                <BranchMap
                  stores={storeList}
                  heat={heat.data?.items ?? []}
                  showStar={searched !== null && heat.data?.product_id != null}
                  selectedId={branchId}
                  zoneStoreIds={zoneStoreIds}
                  onSelect={setBranch}
                />
              </div>
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted">
            <span className="flex items-center gap-2">
              {A.legendLow}
              <span aria-hidden className="h-2.5 w-36 rounded-full" style={{ background: `linear-gradient(90deg, ${HEAT_STOPS.join(",")})` }} />
              {A.legendHigh}
            </span>
            {topStore && <span>★ {A.topBranch}: {displayBranchName(topStore)}</span>}
          </div>
          {selectedStore && (
            <StoreInfo store={selectedStore} movement={selectedMovement} className="mt-3 rounded-xl bg-background px-3 py-2 text-muted" />
          )}
        </Card>

        {branchId === "all" ? (
          <StoreRanking scope={{ mode, range }} storeIdsInZone={zoneStoreIds} onSelect={setBranch} />
        ) : (
          <StoreSidePanel storeId={branchId} pinnedProductId={searched} />
        )}
      </div>
    </section>
  );
}
