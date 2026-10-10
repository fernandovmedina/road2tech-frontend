"use client";

import { useState } from "react";
import { useCatalog, useStore, useStorePlan, useStrategy, useSuppliers } from "@/lib/api/hooks";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { t } from "@/lib/labels";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useLiveStrategy } from "@/components/strategy/useLiveStrategy";
import { ProductContent, type PromoState } from "./ProductContent";
import { BackLink, ProductHeader } from "./ProductHeader";

const P = copy.product;

/**
 * Product + store detail. The promotion comes from `?strategy=` or, without it, from the store's plan (the plan entry
 * whose promoted or anchor product is this one); its discount curve is then fetched with `useStrategy`. The chart and
 * the four tiles always show; the promotion column and the comparison appear only when there is a promotion.
 */
export function ProductBody({ productId, storeId, strategyId }: { productId: string; storeId: string; strategyId?: string }) {
  const catalog = useCatalog();
  const suppliers = useSuppliers();
  const store = useStore(storeId);

  // Only look in the plan when the link did not say which promotion to open.
  const plan = useStorePlan(strategyId ? undefined : storeId);
  const fromPlan = plan.data?.strategies.find((s) => s.promoted_product_id === productId || s.anchor_product_id === productId);
  // Remembered once found: a discarded promotion leaves the plan but must stay on screen with its new status.
  const [foundId, setFoundId] = useState<string | undefined>(undefined);
  if (!foundId && fromPlan) setFoundId(fromPlan.draft_id);
  const draftId = strategyId ?? foundId;
  const detail = useStrategy(draftId);
  const [strategy, updateStrategy] = useLiveStrategy(detail.data ?? null);

  const product = catalog.byId.get(productId);

  if (catalog.isError) return <ErrorState onRetry={() => void catalog.refetch()} />;
  if (catalog.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!product) {
    return (
      <div className="flex flex-col gap-4">
        <div><BackLink /></div>
        <EmptyState title={copy.common.notFoundTitle} text={P.notFound} />
      </div>
    );
  }

  const storeName = store ? displayBranchName(store) : "";
  const supplierName = suppliers.data?.find((s) => s.supplier_id === product.default_supplier.supplier_id)?.supplier_name ?? "";
  const current = strategy && strategy.draft_id === draftId ? strategy : null;

  const looking = draftId ? detail.isPending : plan.isPending;
  const failed = draftId ? detail.isError : plan.isError;
  const state: PromoState = looking ? "loading" : failed ? "error" : current ? "ready" : "none";

  return (
    <div className="flex flex-col gap-5">
      <ProductHeader
        productId={productId}
        storeId={storeId}
        title={product.product_name}
        subtitle={P.subtitle(t("category", product.category_id), supplierName, product.shelf_life_days)}
        status={current?.status ?? null}
      />
      <ProductContent
        key={current?.draft_id ?? "none"}
        product={product}
        storeId={storeId}
        storeName={storeName}
        strategy={current}
        state={state}
        onRetry={() => void (draftId ? detail.refetch() : plan.refetch())}
        onChanged={updateStrategy}
      />
    </div>
  );
}
