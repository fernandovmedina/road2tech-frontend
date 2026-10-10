import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { formatMxnCompact, formatSignedPoints } from "@/lib/format";
import type { OpportunityPoint } from "@/lib/opportunities/presentation";
import { EventTypeIcon } from "./EventTypeIcon";

const SCROLL_MARGIN_PX = 8;

type EventTimelineProps = {
  points: readonly OpportunityPoint[];
  selectedEventId: string | null;
  onSelect: (eventId: string) => void;
  emptyMessage: string;
};

/** Keyboard-friendly list of the map's points, in date order. */
export function EventTimeline({ points, selectedEventId, onSelect, emptyMessage }: EventTimelineProps) {
  const listRef = useRef<HTMLOListElement>(null);

  // Reveal the selected card (e.g. after a click on the map) by scrolling the strip only.
  useEffect(() => {
    const list = listRef.current;
    const card = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !card) return;
    const listBox = list.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    if (cardBox.left < listBox.left) {
      list.scrollBy({ left: cardBox.left - listBox.left - SCROLL_MARGIN_PX, behavior: "smooth" });
    } else if (cardBox.right > listBox.right) {
      list.scrollBy({ left: cardBox.right - listBox.right + SCROLL_MARGIN_PX, behavior: "smooth" });
    }
  }, [points, selectedEventId]);

  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-ink/15 px-4 text-sm text-ink-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol
      ref={listRef}
      aria-label="Opportunity points by date"
      className="flex h-full gap-2 overflow-x-auto pb-1"
    >
      {points.map((point) => {
        const isSelected = point.eventId === selectedEventId;
        return (
          <li key={point.eventId} className="h-full shrink-0">
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(point.eventId)}
              className={cn(
                "flex h-full w-56 flex-col justify-between rounded-xl border bg-surface px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                isSelected ? "border-ink ring-1 ring-ink" : "border-ink/10 hover:border-ink/30",
              )}
            >
              <span className="flex items-center gap-2 text-xs text-ink-secondary">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: point.bin.fill, color: point.bin.iconColor }}
                >
                  <EventTypeIcon type={point.type} className="size-3" />
                </span>
                {point.scheduleLabel}
              </span>
              <span className="truncate text-sm font-semibold text-ink">{point.name}</span>
              <span className="text-xs text-ink-secondary">
                {formatSignedPoints(point.effectPp)} vs. normal day ·{" "}
                {formatMxnCompact(point.expectedExtraSalesMxn)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
