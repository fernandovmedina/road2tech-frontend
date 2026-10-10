import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
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
      <div className="flex h-full items-center justify-center rounded-block border border-dashed border-line px-4 text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol
      ref={listRef}
      aria-label={copy.opportunities.timeline.aria}
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
                "flex h-full w-56 flex-col justify-between rounded-block border bg-card px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected ? "border-foreground ring-1 ring-foreground" : "border-line hover:border-axis",
              )}
            >
              <span className="flex items-center gap-2 text-xs text-muted">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: point.bin.fill, color: point.bin.iconColor }}
                >
                  <EventTypeIcon type={point.type} className="size-3" />
                </span>
                {point.scheduleLabel}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">{point.name}</span>
              <span className="text-xs text-muted">
                {formatSignedPoints(point.effectPp)} {copy.opportunities.timeline.vsNormalDay} ·{" "}
                {formatMxnCompact(point.expectedExtraSalesMxn)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
