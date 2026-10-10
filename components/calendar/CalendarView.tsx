"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCalendarEvents } from "@/lib/api/hooks";
import { useFilters } from "@/lib/filters";
import { copy } from "@/lib/copy";
import { formatDateLong, parseIso, todayIso } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { BranchSelect, useEffectiveBranch } from "@/components/layout/BranchSelect";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { MonthGrid } from "./MonthGrid";
import { CalendarSidebar } from "./CalendarSidebar";
import { OrderModal } from "./OrderModal";
import type { RestockSuggestion } from "@/types";

export function CalendarView() {
  const params = useSearchParams();
  const setBranch = useFilters((s) => s.setBranch);
  const branchId = useEffectiveBranch();
  const events = useCalendarEvents(branchId);

  const dateParam = params.get("date");
  const productParam = params.get("product");
  const branchParam = params.get("branch");

  const start = parseIso(dateParam ?? todayIso());
  const [cursor, setCursor] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(dateParam);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [orderFor, setOrderFor] = useState<RestockSuggestion | null>(null);

  useEffect(() => {
    if (branchParam) setBranch(branchParam);
  }, [branchParam, setBranch]);

  // Deep link from "Ver en calendario": jump to the product's first event
  useEffect(() => {
    if (!productParam || !events.data) return;
    const mine = events.data.filter((e) => e.productId === productParam).sort((a, b) => a.date.localeCompare(b.date));
    const target = mine.find((e) => e.kind === "promo") ?? mine[0];
    if (!target) return;
    const d = parseIso(target.date);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync view to the deep-linked event
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDate(target.date);
    setHighlightId(target.id);
  }, [productParam, events.data]);

  const dayEvents = useMemo(() => (events.data ?? []).filter((e) => e.date === selectedDate), [events.data, selectedDate]);

  const shift = (delta: number) => setCursor((c) => {
    const d = new Date(c.year, c.month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.calendar.title} subtitle={copy.calendar.subtitle}>
        <BranchSelect id="calendar-branch" />
      </PageHeader>

      <div className="grid items-start gap-4 xl:grid-cols-[340px_1fr]">
        <CalendarSidebar branchId={branchId} onOrder={setOrderFor} />
        <Card>
          {events.isError ? (
            <ErrorState onRetry={() => events.refetch()} />
          ) : events.isPending ? (
            <Skeleton className="h-[620px]" />
          ) : (
            <>
              <MonthGrid
                year={cursor.year}
                month={cursor.month}
                events={events.data}
                selectedDate={selectedDate}
                highlightId={highlightId}
                onPrev={() => shift(-1)}
                onNext={() => shift(1)}
                onSelectDate={(d) => { setSelectedDate(d); setHighlightId(null); }}
              />
              {selectedDate && (
                <div className="mt-4 rounded-xl bg-background p-4">
                  <h3 className="text-sm font-extrabold">{copy.calendar.selectedDay}: {formatDateLong(selectedDate)}</h3>
                  {dayEvents.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">—</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                      {dayEvents.map((e) => (
                        <li key={e.id} className="flex items-center gap-2">
                          <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${e.kind === "delivery" ? "bg-primary" : e.kind === "promo" ? "bg-accent" : "bg-alert"}`} />
                          {e.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <OrderModal suggestion={orderFor} onClose={() => setOrderFor(null)} />
    </div>
  );
}
