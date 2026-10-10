"use client";

import { useState, type ReactNode } from "react";
import { useCatalog, useRestockSuggestions } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PanelSection } from "@/components/ui/PanelSection";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { RestockSuggestion } from "@/types";
import { RestockSuggestionCard } from "./RestockSuggestionCard";

const C = copy.calendar;
const FIRST_PAGE = 25;

export type SidebarTab = "products" | "promotions";

export function CalendarSidebar({
  storeId,
  highlightId = null,
  onOrder,
  onFocus,
  tab,
  onTab,
  promotions,
  className = "",
}: {
  className?: string;
  storeId: string;
  tab: SidebarTab;
  onTab: (t: SidebarTab) => void;
  /** Content of the "Promociones" tab (the live promotions of the plan). */
  promotions: ReactNode;
  /** Suggestion to mark and scroll to (the one opened from a "Ver pedido sugerido" link). */
  highlightId?: string | null;
  onOrder: (s: RestockSuggestion) => void;
  onFocus: (productId: string, date: string) => void;
}) {
  const [limit, setLimit] = useState(FIRST_PAGE);
  const suggestions = useRestockSuggestions(storeId, { pageSize: limit });
  const catalog = useCatalog();

  // Urgent first, then by order date (display order only; the backend decides everything else).
  const items = [...(suggestions.data?.items ?? [])].sort(
    (a, b) => Number(b.is_urgent) - Number(a.is_urgent) || a.order_date.localeCompare(b.order_date),
  );
  const total = suggestions.data?.total ?? 0;

  return (
    // The card fills the height its parent gives it (the calendar's height); the list scrolls inside.
    <Card className={`flex h-full min-h-0 flex-col gap-4 ${className}`}>
      <Tabs
        label={C.title}
        value={tab}
        onChange={onTab}
        tabs={[{ id: "products", label: C.tabs.products }, { id: "promotions", label: C.tabs.promotions }]}
      />

      <div className="relative min-h-0 flex-1 overflow-y-auto pr-1">
      {tab === "promotions" ? (
        promotions
      ) : suggestions.isError ? (
        <ErrorState onRetry={() => suggestions.refetch()} />
      ) : suggestions.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <PanelSection title={C.suggestions.title}>
          {items.length === 0 ? (
            <EmptyState text={C.suggestions.nothingToRestock} />
          ) : (
            <>
              {items.map((s) => (
                <RestockSuggestionCard
                  key={s.id}
                  suggestion={s}
                  highlighted={s.id === highlightId}
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
        </PanelSection>
      )}
      </div>
    </Card>
  );
}
