"use client";

import { useEffect } from "react";
import { useFilters } from "@/lib/filters";
import { ProductBody } from "./ProductBody";
import { BackLink } from "./ProductHeader";
import { StorePicker } from "./StorePicker";

/**
 * Product detail shell. The store comes from `?store=`, else from the global branch filter; without either the user
 * picks one (the picker writes the global filter, so the choice follows them to other screens).
 */
export function ProductDetail({ productId, storeId, strategyId }: { productId: string; storeId?: string; strategyId?: string }) {
  const filterBranch = useFilters((s) => s.branchId);
  const store = storeId ?? (filterBranch !== "all" ? filterBranch : undefined);

  // Deep links (`?store=`) also update the global filter so the other screens open on the same store.
  useEffect(() => {
    const filters = useFilters.getState();
    if (storeId && filters.branchId !== storeId) filters.setBranch(storeId);
  }, [storeId]);

  return store ? (
    <ProductBody key={`${productId}:${store}:${strategyId ?? ""}`} productId={productId} storeId={store} strategyId={strategyId} />
  ) : (
    <div className="flex flex-col gap-4">
      <div><BackLink /></div>
      <StorePicker />
    </div>
  );
}
