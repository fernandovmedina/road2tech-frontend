"use client";

import { useEffect, useMemo, useState } from "react";
import { useAsOf, useCalendar, useCatalog, useRestockSuggestions, useStorePlan } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMonth } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import type { RestockSuggestion } from "@/types";
import { CalendarSidebar, type SidebarTab } from "./CalendarSidebar";
import { cursorOf, gridDays, shiftMonth, type MonthCursor } from "./calendarMath";
import { DayPanel } from "./DayPanel";
import { byPriority, categoryDot, CATEGORIES, describeEvent, describeSuggestion, type DescribedEvent } from "./eventPresentation";
import { LayerSwitch } from "./LayerSwitch";
import { MonthGrid } from "./MonthGrid";
import { OrderModal } from "./OrderModal";
import { PromoGantt } from "./PromoGantt";
import { PromoList } from "./PromoList";

const C = copy.calendar;
const BASE_LAYERS = "deliveries,strategies,alerts";

const navBtn =
  "flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-white text-lg hover:bg-background";

/**
 * Calendar of one store. Mounted with `key` per deep link so the initial focus/date apply once.
 * `linkedOrderId` (from `?order=`) opens that suggestion's Orden Restock modal once, as soon as the suggestions load.
 */
export function CalendarContent({
  storeId,
  initialDate,
  initialProduct,
  linkedOrderId,
  onLinkedOrderDone,
}: {
  storeId: string;
  initialDate: string | null;
  initialProduct: string | null;
  linkedOrderId: string | null;
  /** Called when the linked order is closed or was not found, so the parent can drop `?order=` from the URL. */
  onLinkedOrderDone: () => void;
}) {
  const asOf = useAsOf();
  const catalog = useCatalog();
  const plan = useStorePlan(storeId);

  const [cursorOverride, setCursorOverride] = useState<MonthCursor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [focusProduct, setFocusProduct] = useState<string | null>(initialProduct);
  const [showContext, setShowContext] = useState(false);
  // "promotions" swaps the month grid for the Gantt of the plan's promotions.
  const [tab, setTab] = useState<SidebarTab>("products");
  const [selectedPromo, setSelectedPromo] = useState<string | null>(null);
  const [orderFor, setOrderFor] = useState<RestockSuggestion | null>(null);
  const [handledOrder, setHandledOrder] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [orderMissing, setOrderMissing] = useState(false);
  const linkedLookup = useRestockSuggestions(linkedOrderId ? storeId : undefined, {
    productId: initialProduct ?? undefined,
    pageSize: 100,
  });

  const anchor = initialDate ?? asOf;
  const cursor = cursorOverride ?? (anchor ? cursorOf(anchor) : null);
  const days = useMemo(() => (cursor ? gridDays(cursor) : []), [cursor]);
  const from = days[0]?.iso ?? "";
  const to = days[days.length - 1]?.iso ?? "";

  const calendar = useCalendar(cursor ? storeId : undefined, from, to, showContext ? `${BASE_LAYERS},context` : BASE_LAYERS);

  const strategyById = useMemo(() => new Map((plan.data?.strategies ?? []).map((s) => [s.draft_id, s])), [plan.data]);
  const nameOf = catalog.nameOf;

  // Orders recommended by the agent and not sent yet: drawn on the day they should be placed.
  const suggestions = useRestockSuggestions(storeId, { pageSize: 100 });

  // Every event of the visible month, most important first inside each day (late or suggested orders before
  // what already arrived or is on its way).
  const eventsByDate = useMemo(() => {
    const map = new Map<string, DescribedEvent[]>();
    const add = (date: string, d: DescribedEvent) => map.set(date, [...(map.get(date) ?? []), d]);
    if (asOf) {
      for (const e of calendar.data?.events ?? []) add(e.date, describeEvent(e, nameOf, (id) => strategyById.get(id)?.title, asOf));
    }
    for (const s of suggestions.data?.items ?? []) {
      if (s.order_status === "sent" || s.order_date < from || s.order_date > to) continue;
      add(s.order_date, describeSuggestion(s, nameOf));
    }
    for (const [date, list] of map) map.set(date, list.sort(byPriority));
    return map;
  }, [asOf, calendar.data, suggestions.data, nameOf, strategyById, from, to]);

  const contextByDate = useMemo(
    () => (showContext ? new Map((calendar.data?.context ?? []).map((c) => [c.date, c])) : undefined),
    [calendar.data, showContext],
  );

  const focusEvents = useMemo(() => {
    if (!focusProduct) return [];
    return [...eventsByDate.values()]
      .flat()
      .filter((d) => d.productId === focusProduct)
      .sort((a, b) => a.event.date.localeCompare(b.event.date) || byPriority(a, b));
  }, [eventsByDate, focusProduct]);

  const jumpTo = (iso: string) => {
    setSelectedDate(iso);
    setCursorOverride(cursorOf(iso));
  };

  // Linked order ("Ver pedido sugerido"): once its suggestions are in, open that order a single time.
  // Derived during render (no effect) and guarded by `handledOrder`, so closing or re-rendering never reopens it.
  if (linkedOrderId && handledOrder !== linkedOrderId && linkedLookup.data && !linkedLookup.isPlaceholderData) {
    // Match by id first; ids are opaque and may differ between sources (e.g. hybrid mode: dashboard alerts from the mock,
    // suggestions from the live backend), so fall back to the pending suggestion of the same product.
    const pending = linkedLookup.data.items.filter((s) => s.order_status !== "sent");
    const found = pending.find((s) => s.id === linkedOrderId) ?? (initialProduct ? pending.find((s) => s.product_id === initialProduct) : undefined);
    setHandledOrder(linkedOrderId);
    setOrderMissing(!found);
    if (found) {
      setHighlightId(found.id);
      setFocusProduct(found.product_id);
      if (!initialDate) jumpTo(found.expected_delivery_date);
      if (!orderFor) setOrderFor(found);
    }
  }

  useEffect(() => {
    if (orderMissing) onLinkedOrderDone();
  }, [orderMissing, onLinkedOrderDone]);

  const closeOrder = () => {
    setOrderFor(null);
    onLinkedOrderDone();
  };

  const hasEventsThisMonth = days.some((d) => d.inMonth && eventsByDate.has(d.iso));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      {orderMissing && (
        <p role="status" className="rounded-[10px] bg-[#FFF4D6] px-3 py-2 text-sm font-semibold text-[#8A5A00] xl:col-span-2">
          {C.orderMissing}
        </p>
      )}
      {/* Wide screens: the sidebar is as tall as the calendar card (absolute fill) and scrolls inside; narrow: fixed height. */}
      <div className="relative h-[560px] xl:h-auto xl:min-h-[520px]">
      <CalendarSidebar
        className="xl:absolute xl:inset-0"
        storeId={storeId}
        highlightId={highlightId}
        tab={tab}
        onTab={setTab}
        promotions={
          <PromoList
            strategies={plan.data?.strategies}
            loading={plan.isPending}
            error={plan.isError}
            onRetry={() => plan.refetch()}
            selectedId={selectedPromo}
            onSelect={setSelectedPromo}
          />
        }
        onOrder={setOrderFor}
        onFocus={(productId, date) => {
          setFocusProduct(productId);
          jumpTo(date);
        }}
      />
      </div>

      <Card className="min-w-0">
        {tab === "promotions" ? (
          !asOf || plan.isPending ? (
            <Skeleton className="h-[420px]" />
          ) : plan.isError ? (
            <ErrorState onRetry={() => plan.refetch()} />
          ) : (
            <PromoGantt
              strategies={plan.data.strategies}
              asOf={asOf}
              storeId={storeId}
              selectedId={selectedPromo}
              onSelect={setSelectedPromo}
              nameOf={nameOf}
            />
          )
        ) : !cursor || !asOf ? (
          <Skeleton className="h-[620px]" />
        ) : calendar.isError ? (
          <ErrorState onRetry={() => calendar.refetch()} />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold" aria-live="polite">{formatMonth(cursor.year, cursor.month)}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <LayerSwitch id="calendar-context" label={C.contextLayer} hint={C.contextHint} checked={showContext} onChange={setShowContext} />
                <button type="button" onClick={() => jumpTo(asOf)} className="min-h-11 rounded-[10px] border border-line bg-white px-3 text-sm font-semibold hover:bg-background">
                  {C.goToday}
                </button>
                <button type="button" aria-label={C.prev} onClick={() => setCursorOverride(shiftMonth(cursor, -1))} className={navBtn}>‹</button>
                <button type="button" aria-label={C.next} onClick={() => setCursorOverride(shiftMonth(cursor, 1))} className={navBtn}>›</button>
              </div>
            </div>

            <ul className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-muted">
              {CATEGORIES.map((k) => (
                <li key={k} className="flex items-center gap-1.5">
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${categoryDot[k]}`} />
                  {C.legend[k]}
                </li>
              ))}
            </ul>

            {calendar.isPending ? (
              <Skeleton className="h-[560px]" />
            ) : (
              <div aria-busy={calendar.isPlaceholderData} className={calendar.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
                <MonthGrid
                  days={days}
                  today={asOf}
                  selectedDate={selectedDate}
                  eventsByDate={eventsByDate}
                  contextByDate={contextByDate}
                  focusProductId={focusProduct}
                  onSelectDate={setSelectedDate}
                />
                {!hasEventsThisMonth && <p className="mt-3 rounded-[10px] bg-background px-3 py-2 text-sm text-muted">{C.noEvents}</p>}
                <DayPanel
                  storeId={storeId}
                  date={selectedDate}
                  events={selectedDate ? eventsByDate.get(selectedDate) ?? [] : []}
                  context={selectedDate ? calendar.data?.context.find((c) => c.date === selectedDate) : undefined}
                  focus={focusProduct ? { name: nameOf(focusProduct), events: focusEvents } : null}
                  strategyProductId={(id) => strategyById.get(id)?.promoted_product_id}
                  onOrder={setOrderFor}
                  onPickDate={jumpTo}
                  onClearFocus={() => setFocusProduct(null)}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <OrderModal suggestion={orderFor} onClose={closeOrder} />
    </div>
  );
}
