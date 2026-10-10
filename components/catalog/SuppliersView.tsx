"use client";

import { useState } from "react";
import { useSuppliers } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ResendCard } from "./ResendCard";
import { SupplierOffers } from "./SupplierOffers";
import { SupplierTable } from "./SupplierTable";

const S = copy.suppliers;

// TODO(backend): suppliers are read-only in the contract (docs/backend-contract.md §3.14). There is no endpoint to
// create or edit a supplier; cost, minimum order and lead time live in each supplier's offers (supplier_products).
export function SuppliersView() {
  const suppliers = useSuppliers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = suppliers.data?.find((s) => s.supplier_id === selectedId) ?? null;

  return (
    <>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      {suppliers.isPending ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" aria-busy="true">
          <Card className="flex flex-col gap-2">
            {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-12" />)}
          </Card>
          <Skeleton className="h-64" />
        </div>
      ) : suppliers.isError ? (
        <ErrorState onRetry={() => suppliers.refetch()} />
      ) : suppliers.data.length === 0 ? (
        <EmptyState title={S.emptyTitle} text={S.empty} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <SupplierTable suppliers={suppliers.data} selectedId={selectedId} onSelect={setSelectedId} />
            <ResendCard key={selected?.supplier_id ?? "none"} supplier={selected} />
          </div>

          {selected ? (
            <SupplierOffers key={selected.supplier_id} supplier={selected} />
          ) : (
            <EmptyState title={S.selectTitle} text={S.selectHint} />
          )}
          <p className="text-xs text-muted">{S.readOnlyNote}</p>
        </div>
      )}
    </>
  );
}
