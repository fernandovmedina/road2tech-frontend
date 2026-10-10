import { useId, useState } from "react";
import { copy } from "@/lib/copy";
import { formatMxnCompact } from "@/lib/format";
import { EVENT_TYPE_LABELS, EVENT_TYPE_ORDER } from "@/lib/opportunities/labels";
import { bubbleLegendSteps, CHANGE_BINS } from "@/lib/opportunities/presentation";
import { EventTypeIcon } from "../EventTypeIcon";
import { LegendSection } from "./LegendSection";

type MapLegendProps = {
  showEventKeys: boolean;
  maxExtraSalesMxn: number;
};

/** Compact legend: the color scale is always visible, the rest expands on demand. */
export function MapLegend({ showEventKeys, maxExtraSalesMxn }: MapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();

  return (
    <div className="absolute bottom-3 left-3 z-[1001] max-w-[calc(100%-1.5rem)] rounded-card border border-line bg-card/95 text-xs text-foreground shadow-sm backdrop-blur-sm">
      {showEventKeys && isExpanded && (
        <div id={detailsId} className="flex flex-col gap-3 border-b border-line px-3 py-3">
          {maxExtraSalesMxn > 0 && (
            <LegendSection title={copy.opportunities.mapLegend.bubbleSize}>
              <ul className="flex items-end gap-4">
                {bubbleLegendSteps(maxExtraSalesMxn).map((step) => (
                  <li key={step.valueMxn} className="flex flex-col items-center gap-1">
                    <span
                      className="rounded-full border border-muted"
                      style={{ width: step.diameterPx, height: step.diameterPx }}
                      aria-hidden
                    />
                    <span className="tabular-nums text-muted">
                      {formatMxnCompact(step.valueMxn)}
                    </span>
                  </li>
                ))}
              </ul>
            </LegendSection>
          )}
          <LegendSection title={copy.opportunities.mapLegend.eventType}>
            <ul className="grid grid-cols-3 gap-x-4 gap-y-1">
              {EVENT_TYPE_ORDER.map((type) => (
                <li key={type} className="flex items-center gap-1.5">
                  <EventTypeIcon type={type} className="size-3.5 shrink-0 text-muted" />
                  {EVENT_TYPE_LABELS[type]}
                </li>
              ))}
            </ul>
          </LegendSection>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li className="flex items-center gap-1.5">
              <span className="w-5 border-t-2 border-dashed border-muted" aria-hidden />
              {copy.opportunities.mapLegend.influenceRadius}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-[3px] bg-foreground" aria-hidden />
              {copy.opportunities.mapLegend.affectedBranch}
            </li>
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        {showEventKeys && (
          <>
            <span className="font-medium text-muted">{copy.opportunities.mapLegend.eventEffect}</span>
            {CHANGE_BINS.map((bin) => (
              <span key={bin.label} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: bin.fill }} aria-hidden />
                {bin.label}
              </span>
            ))}
          </>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] border-2 border-muted bg-card" aria-hidden />
          {copy.opportunities.mapLegend.branch}
        </span>
        {showEventKeys && (
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="rounded-md px-1.5 py-0.5 font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {isExpanded ? copy.opportunities.mapLegend.less : copy.opportunities.mapLegend.more}
          </button>
        )}
      </div>
    </div>
  );
}
