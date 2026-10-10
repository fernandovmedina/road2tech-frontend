"use client";

import { useState } from "react";
import { useCatalog, useRestockSuggestions } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { RestockSuggestion } from "@/types";
import { PlanStrategies } from "./PlanStrategies";
import { RestockSuggestionCard } from "./RestockSuggestionCard";
import { SupplierSummaryList } from "./SupplierSummaryList";

const C = copy.calendar;
const FIRST_PAGE = 25;

type Tab = "products" | "suppliers";

export function CalendarSidebar({
  storeId,
  onOrder,
  onFocus,
}: {
  storeId: string;
  onOrder: (s: RestockSuggestion) => void;
  onFocus: (productId: string, date: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("products");
  const [limit, setLimit] = useState(FIRST_PAGE);
  const suggestions = useRestockSuggestions(storeId, { pageSize: limit });
  const catalog = useCatalog();

  // Urgent first, then by order date (display order only; the backend decides everything else).
  const items = [...(suggestions.data?.items ?? [])].sort(
    (a, b) => Number(b.is_urgent) - Number(a.is_urgent) || a.order_date.localeCompare(b.order_date),
  );
  const total = suggestions.data?.total ?? 0;

  return (
    <Card className="flex flex-col gap-4">
      <Tabs
        label={C.title}
        value={tab}
        onChange={setTab}
        tabs={[{ id: "products", label: C.tabs.products }, { id: "suppliers", label: C.tabs.suppliers }]}
      />

      {suggestions.isError ? (
        <ErrorState onRetry={() => suggestions.refetch()} />
      ) : suggestions.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : tab === "products" ? (
        <div className="flex flex-col gap-3">
          <h3 className="mt-1 text-sm font-extrabold">{C.suggestions.title}</h3>
          {items.length === 0 ? (
            <EmptyState text={C.suggestions.nothingToRestock} />
          ) : (
            <>
              {items.map((s) => (
                <RestockSuggestionCard
                  key={s.id}
                  suggestion={s}
                  productName={catalog.nameOf(s.product_id)}
                  onOrder={onOrder}
                  onFocus={onFocus}
                />
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">{C.suggestions.showing(items.length, total)}</p>
                {total > items.length && (
                  <Button size="sm" variant="secondary" onClick={() => setLimit((l) => l + FIRST_PAGE)}>
                    {C.suggestions.showMore}
                  </Button>
                )}
              </div>
            </>
          )}
          <PlanStrategies storeId={storeId} />
        </div>
      ) : (
        <SupplierSummaryList suggestions={items} />
      )}
    </Card>
  );
}
