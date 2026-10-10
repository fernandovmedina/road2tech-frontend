"use client";

import { useMemo, useState } from "react";
import { useAsOf, useCalendar, useCatalog, useStorePlan } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMonth } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import type { RestockSuggestion } from "@/types";
import { CalendarSidebar } from "./CalendarSidebar";
import { cursorOf, gridDays, shiftMonth, type MonthCursor } from "./calendarMath";
import { DayPanel } from "./DayPanel";
import { describeEvent, kindDot, type DescribedEvent, type EventKind } from "./eventPresentation";
import { LayerSwitch } from "./LayerSwitch";
import { MonthGrid } from "./MonthGrid";
import { OrderModal } from "./OrderModal";

const C = copy.calendar;
const BASE_LAYERS = "deliveries,strategies,alerts";
const KINDS: EventKind[] = ["delivery", "strategy", "alert"];

const navBtn =
  "flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-white text-lg hover:bg-background";

/** Calendar of one store. Mounted with `key` per deep link so the initial focus/date apply once. */
export function CalendarContent({
  storeId,
  initialDate,
  initialProduct,
}: {
  storeId: string;
  initialDate: string | null;
  initialProduct: string | null;
}) {
  const asOf = useAsOf();
  const catalog = useCatalog();
  const plan = useStorePlan(storeId);

  const [cursorOverride, setCursorOverride] = useState<MonthCursor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [focusProduct, setFocusProduct] = useState<string | null>(initialProduct);
  const [showContext, setShowContext] = useState(false);
  const [orderFor, setOrderFor] = useState<RestockSuggestion | null>(null);

  const anchor = initialDate ?? asOf;
  const cursor = cursorOverride ?? (anchor ? cursorOf(anchor) : null);
  const days = useMemo(() => (cursor ? gridDays(cursor) : []), [cursor]);
  const from = days[0]?.iso ?? "";
  const to = days[days.length - 1]?.iso ?? "";

  const calendar = useCalendar(cursor ? storeId : undefined, from, to, showContext ? `${BASE_LAYERS},context` : BASE_LAYERS);

  const strategyById = useMemo(() => new Map((plan.data?.strategies ?? []).map((s) => [s.draft_id, s])), [plan.data]);
  const nameOf = catalog.nameOf;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DescribedEvent[]>();
    for (const e of calendar.data?.events ?? []) {
      const d = describeEvent(e, nameOf, (id) => strategyById.get(id)?.title);
      map.set(e.date, [...(map.get(e.date) ?? []), d]);
    }
    return map;
  }, [calendar.data, nameOf, strategyById]);

  const contextByDate = useMemo(
    () => (showContext ? new Map((calendar.data?.context ?? []).map((c) => [c.date, c])) : undefined),
    [calendar.data, showContext],
  );

  const focusEvents = useMemo(() => {
    if (!focusProduct) return [];
    return [...eventsByDate.values()].flat().filter((d) => d.productId === focusProduct).sort((a, b) => a.event.date.localeCompare(b.event.date));
  }, [eventsByDate, focusProduct]);

  const jumpTo = (iso: string) => {
    setSelectedDate(iso);
    setCursorOverride(cursorOf(iso));
  };

  const hasEventsThisMonth = days.some((d) => d.inMonth && eventsByDate.has(d.iso));

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[360px_1fr]">
      <CalendarSidebar
        storeId={storeId}
        onOrder={setOrderFor}
        onFocus={(productId, date) => {
          setFocusProduct(productId);
          jumpTo(date);
        }}
      />

      <Card>
        {!cursor || !asOf ? (
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
              {KINDS.map((k) => (
                <li key={k} className="flex items-center gap-1.5">
                  <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${kindDot[k]}`} />
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
                  onPickDate={jumpTo}
                  onClearFocus={() => setFocusProduct(null)}
                />
              </div>
            )}
          </>
        )}
      </Card>

      <OrderModal suggestion={orderFor} onClose={() => setOrderFor(null)} />
    </div>
  );
}
