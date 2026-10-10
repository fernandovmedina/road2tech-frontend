"use client";

import { copy } from "@/lib/copy";
import { formatMonth, toIso, todayIso } from "@/lib/format";
import type { CalendarEvent } from "@/types";

const C = copy.calendar;

const kindStyle: Record<CalendarEvent["kind"], string> = {
  delivery: "bg-primary-tint text-primary border-primary/30",
  promo: "bg-accent-tint text-accent-dark border-accent/30",
  alert: "bg-alert-tint text-alert-dark border-alert/30",
};

// Monday-first 6x7 grid
function buildDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 - offset + i);
    return { iso: toIso(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

export function MonthGrid({
  year,
  month,
  events,
  selectedDate,
  highlightId,
  onPrev,
  onNext,
  onSelectDate,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDate: string | null;
  highlightId: string | null;
  onPrev: () => void;
  onNext: () => void;
  onSelectDate: (iso: string) => void;
}) {
  const days = buildDays(year, month);
  const today = todayIso();
  const byDate = new Map<string, CalendarEvent[]>();
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const monthHasEvents = days.some((d) => d.inMonth && byDate.has(d.iso));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold" aria-live="polite">{formatMonth(year, month)}</h2>
        <div className="flex gap-2">
          <button type="button" aria-label={C.prev} onClick={onPrev} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-white text-lg hover:bg-background">‹</button>
          <button type="button" aria-label={C.next} onClick={onNext} className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-white text-lg hover:bg-background">›</button>
        </div>
      </div>

      <ul className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-muted">
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-primary" />{C.legend.delivery}</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-accent" />{C.legend.promo}</li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-alert" />{C.legend.alert}</li>
      </ul>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-px text-center text-xs font-bold text-muted">
            {C.weekdays.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {days.map((d) => {
              const evs = byDate.get(d.iso) ?? [];
              const isToday = d.iso === today;
              const selected = d.iso === selectedDate;
              return (
                <div
                  key={d.iso}
                  className={`flex min-h-[104px] flex-col gap-1 p-1.5 ${d.inMonth ? "bg-white" : "bg-background/70"} ${selected ? "ring-2 ring-inset ring-primary" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDate(d.iso)}
                    aria-label={`${d.day}${isToday ? ` (${C.today})` : ""}`}
                    className={`flex h-7 w-7 items-center justify-center self-end rounded-full text-xs font-bold ${
                      isToday ? "bg-primary text-white" : d.inMonth ? "text-foreground hover:bg-background" : "text-muted/50"
                    }`}
                  >
                    {d.day}
                  </button>
                  {evs.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelectDate(d.iso)}
                      title={e.label}
                      className={`truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-semibold ${kindStyle[e.kind]} ${highlightId === e.id ? "ring-2 ring-foreground" : ""}`}
                    >
                      {e.label}
                    </button>
                  ))}
                  {evs.length > 3 && (
                    <button type="button" onClick={() => onSelectDate(d.iso)} className="text-left text-[11px] font-bold text-muted hover:underline">
                      {C.more(evs.length - 3)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!monthHasEvents && <p className="mt-3 rounded-[10px] bg-background px-3 py-2 text-sm text-muted">{C.noEvents}</p>}
    </div>
  );
}
