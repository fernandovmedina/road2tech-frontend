import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatDate, formatDateLong } from "@/lib/format";
import { productHref } from "@/lib/links";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { CalendarContext } from "@/types";
import { describeContext } from "./contextInfo";
import { kindDot, type DescribedEvent } from "./eventPresentation";

const C = copy.calendar;

function EventItem({ item, storeId, strategyProductId }: { item: DescribedEvent; storeId: string; strategyProductId: (strategyId: string) => string | undefined }) {
  const productId =
    item.event.kind === "strategy" ? strategyProductId(item.event.strategy_id) : item.productId ?? undefined;
  const strategyId = item.event.kind === "strategy" ? item.event.strategy_id : undefined;
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm ${kindDot[item.kind]}`} />
      <div className="min-w-0">
        <p className="font-semibold">{item.label}</p>
        {item.details.length > 0 && <p className="text-xs text-muted">{item.details.join(" · ")}</p>}
        {productId && (
          <Link
            href={productHref(productId, { storeId, strategyId })}
            className="mt-0.5 inline-flex min-h-11 items-center text-xs font-bold text-primary hover:underline"
          >
            {C.events.viewProduct}
          </Link>
        )}
      </div>
    </li>
  );
}

/** Details of the selected day and, when a product is in focus, all its events in the visible month. */
export function DayPanel({
  storeId,
  date,
  events,
  context,
  focus,
  strategyProductId,
  onPickDate,
  onClearFocus,
}: {
  storeId: string;
  date: string | null;
  events: DescribedEvent[];
  context: CalendarContext | undefined;
  focus: { name: string; events: DescribedEvent[] } | null;
  strategyProductId: (strategyId: string) => string | undefined;
  onPickDate: (iso: string) => void;
  onClearFocus: () => void;
}) {
  const ctx = context ? describeContext(context) : null;

  if (!date && !focus) return null;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {focus && (
        <section aria-label={C.focus.product} className="rounded-xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">
              {C.focus.product}: {focus.name}
            </h3>
            <Button variant="secondary" size="sm" onClick={onClearFocus}>{C.focus.clear}</Button>
          </div>
          {focus.events.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{C.focus.none}</p>
          ) : (
            <>
              <p className="mt-2 text-xs font-semibold text-muted">{C.focus.listTitle}</p>
              <ul className="mt-1 flex flex-col">
                {focus.events.map((d) => (
                  <li key={d.event.id}>
                    <button
                      type="button"
                      onClick={() => onPickDate(d.event.date)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-background"
                    >
                      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-sm ${kindDot[d.kind]}`} />
                      <span className="shrink-0 font-bold">{formatDate(d.event.date)}</span>
                      <span className="truncate">{d.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {date && (
        <section aria-label={C.selectedDay} className="rounded-xl bg-background p-4">
          <h3 className="text-sm font-extrabold">
            {C.selectedDay}: {formatDateLong(date)}
          </h3>
          {events.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{C.noEventsDay}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {events.map((d) => (
                <EventItem key={d.event.id} item={d} storeId={storeId} strategyProductId={strategyProductId} />
              ))}
            </ul>
          )}

          {ctx && (
            <div className="mt-3 border-t border-line pt-3">
              <h4 className="text-xs font-extrabold text-muted">{C.contextLayer}</h4>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {ctx.tags.map((tag) => (
                  <Badge key={tag.key} tone={tag.tone === "info" ? "blue" : "gray"}>{tag.text}</Badge>
                ))}
                {ctx.scope && <span className="text-xs text-muted">{ctx.scope}</span>}
              </div>
              <p className={`mt-1.5 text-sm ${ctx.isForecast ? "italic" : ""}`}>
                {C.context.weather}: {ctx.weather} · {ctx.temp}
                {ctx.rain && <> · {ctx.rain}</>}
              </p>
              {ctx.isForecast && <p className="text-xs text-muted">{C.context.forecast}: {C.context.forecastNote}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
