"use client";

import Link from "next/link";
import { useEffect } from "react";
import { copy } from "@/lib/copy";
import { useFilters } from "@/lib/filters";
import { ProductBody } from "./ProductBody";
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

  return (
    <div className="flex flex-col gap-2">
      <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-primary hover:underline">
        <span aria-hidden>←</span> {copy.product.back}
      </Link>
      {store ? (
        <ProductBody key={`${productId}:${store}:${strategyId ?? ""}`} productId={productId} storeId={store} strategyId={strategyId} />
      ) : (
        <StorePicker />
      )}
    </div>
  );
}
