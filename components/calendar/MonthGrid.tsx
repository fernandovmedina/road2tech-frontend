import { copy } from "@/lib/copy";
import type { CalendarContext } from "@/types";
import type { GridDay } from "./calendarMath";
import { DayCell } from "./DayCell";
import type { DescribedEvent } from "./eventPresentation";

const C = copy.calendar;

export function MonthGrid({
  days,
  today,
  selectedDate,
  eventsByDate,
  contextByDate,
  focusProductId,
  onSelectDate,
}: {
  days: GridDay[];
  today: string;
  selectedDate: string | null;
  eventsByDate: Map<string, DescribedEvent[]>;
  /** Undefined when the "Contexto" layer is off. */
  contextByDate: Map<string, CalendarContext> | undefined;
  focusProductId: string | null;
  onSelectDate: (iso: string) => void;
}) {
  return (
    <div className="relative overflow-x-auto">
      <div role="group" aria-label={C.gridLabel} className="min-w-[680px]">
        <div aria-hidden className="grid grid-cols-7 gap-px text-center text-xs font-bold text-muted">
          {C.weekdays.map((w) => <div key={w} className="py-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
          {days.map((d) => (
            <DayCell
              key={d.iso}
              day={d}
              isToday={d.iso === today}
              selected={d.iso === selectedDate}
              events={eventsByDate.get(d.iso) ?? []}
              context={contextByDate?.get(d.iso)}
              focusProductId={focusProductId}
              onSelect={onSelectDate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
