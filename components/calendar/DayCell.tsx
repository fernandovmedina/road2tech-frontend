import { copy } from "@/lib/copy";
import { formatDateLong } from "@/lib/format";
import type { CalendarContext } from "@/types";
import type { GridDay } from "./calendarMath";
import { describeContext } from "./contextInfo";
import { categoryChip, type DescribedEvent } from "./eventPresentation";

const C = copy.calendar;
const MAX_CHIPS = 3;

const tagTone = { info: "bg-info-tint text-info", muted: "bg-[#EEF1F0] text-muted" } as const;

export function DayCell({
  day,
  isToday,
  selected,
  events,
  context,
  focusProductId,
  onSelect,
}: {
  day: GridDay;
  isToday: boolean;
  selected: boolean;
  events: DescribedEvent[];
  /** Pass only when the "Contexto" layer is on. */
  context: CalendarContext | undefined;
  focusProductId: string | null;
  onSelect: (iso: string) => void;
}) {
  const ctx = context ? describeContext(context) : null;
  const visible = events.slice(0, MAX_CHIPS);
  const hidden = events.length - visible.length;

  return (
    <div
      className={`flex min-h-[112px] flex-col gap-1 p-1.5 ${day.inMonth ? "bg-white" : "bg-background/70"} ${selected ? "ring-2 ring-inset ring-primary" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSelect(day.iso)}
        aria-label={`${formatDateLong(day.iso)}${isToday ? `, ${C.today}` : ""}`}
        aria-current={isToday ? "date" : undefined}
        className={`flex h-9 w-9 items-center justify-center self-end rounded-full text-xs font-bold ${
          isToday ? "bg-primary text-white" : day.inMonth ? "text-foreground hover:bg-background" : "text-muted/60 hover:bg-background"
        }`}
      >
        {day.day}
      </button>

      {ctx && (
        <div className="flex flex-col gap-0.5">
          {ctx.tags.slice(0, 2).map((tag) => (
            <span key={tag.key} title={tag.text} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-bold ${tagTone[tag.tone]}`}>
              {tag.text}
            </span>
          ))}
          <span
            title={ctx.isForecast ? C.context.forecastNote : undefined}
            className={`truncate text-[10px] text-muted ${ctx.isForecast ? "italic" : ""}`}
          >
            {ctx.weather} · {ctx.temp}
            {ctx.isForecast && <span className="sr-only"> ({C.context.forecast})</span>}
            {ctx.isForecast && <span aria-hidden> *</span>}
          </span>
        </div>
      )}

      {visible.map((d) => (
        <button
          key={d.event.id}
          type="button"
          onClick={() => onSelect(day.iso)}
          title={d.label}
          className={`min-h-6 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-semibold ${categoryChip[d.category]} ${
            focusProductId && d.productId === focusProductId ? "ring-2 ring-foreground" : ""
          }`}
        >
          {d.label}
        </button>
      ))}
      {hidden > 0 && (
        <button type="button" onClick={() => onSelect(day.iso)} className="min-h-6 text-left text-[11px] font-bold text-muted hover:underline">
          {C.more(hidden)}
        </button>
      )}
    </div>
  );
}
