import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { formatSignedPoints } from "@/lib/format";
import type { LabelSide, OpportunityPoint } from "@/lib/opportunities/presentation";
import { EventTypeIcon } from "../EventTypeIcon";

export type BubbleLabelMode = "schedule" | "effect";

const LABEL_POSITION: Record<LabelSide, string> = {
  below: "left-1/2 top-full mt-2 -translate-x-1/2",
  above: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
};

type EventBubbleProps = {
  point: OpportunityPoint;
  isSelected: boolean;
  /** Hovered or keyboard-focused. */
  isHighlighted: boolean;
  /** Side picked by label placement; null when there is no room (label shows on hover/focus). */
  labelSide: LabelSide | null;
  labelMode: BubbleLabelMode;
};

/** One opportunity point: icon bubble (size = impact, color = change) plus its label. */
export function EventBubble({ point, isSelected, isHighlighted, labelSide, labelMode }: EventBubbleProps) {
  const size = point.diameterPx;
  const shownSide = labelSide ?? (isSelected || isHighlighted ? "below" : null);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className={cn(
          "flex size-full items-center justify-center rounded-full ring-2 ring-card transition-transform duration-150",
          isSelected ? "scale-110 shadow-lg outline-2 outline-offset-2 outline-foreground" : "shadow-md",
          isHighlighted && !isSelected && "scale-105",
        )}
        style={{ backgroundColor: point.bin.fill, color: point.bin.iconColor }}
      >
        <EventTypeIcon type={point.type} size={Math.round(size * 0.46)} strokeWidth={2} />
      </div>
      {shownSide && (
        <div
          className={cn(
            "absolute whitespace-nowrap rounded-md px-2 py-1 text-center shadow-sm ring-1",
            LABEL_POSITION[shownSide],
            isSelected ? "bg-foreground text-white ring-foreground" : "bg-card/95 text-foreground ring-line",
          )}
        >
          <p className="text-[11px] font-semibold leading-tight">{point.name}</p>
          <p className={cn("text-[10px] leading-tight", isSelected ? "text-white/80" : "text-muted")}>
            {labelMode === "effect"
              ? `${formatSignedPoints(point.effectPp)} ${copy.opportunities.timeline.vsNormalDay}`
              : point.scheduleLabel}
          </p>
        </div>
      )}
    </div>
  );
}
