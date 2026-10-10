"use client";

import { copy } from "@/lib/copy";
import { BranchSelect, useEffectiveBranch } from "@/components/layout/BranchSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { PolicyEditor } from "./PolicyEditor";

const P = copy.products;

// Min/max are per store (reorder_point / max_stock, docs/backend-contract.md §3.9), so a store is required.
export function ProductsView() {
  const branchId = useEffectiveBranch();

  return (
    <>
      <PageHeader title={P.title} subtitle={P.subtitle}>
        <BranchSelect id="products-branch" includeAll={false} />
      </PageHeader>

      {branchId === "all" ? (
        <EmptyState title={P.chooseBranchTitle} text={P.chooseBranchText} />
      ) : (
        <PolicyEditor key={branchId} storeId={branchId} />
      )}
    </>
  );
}
