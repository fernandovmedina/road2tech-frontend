import { divIcon, type LeafletEventHandlerFnMap } from "leaflet";
import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { formatInteger, formatSignedPercent } from "@/lib/format";
import { RISK_PRESENTATION, ZONE_LABELS } from "@/lib/opportunities/storePresentation";
import type { Branch } from "@/types/branch";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";

type StoreDemandMarkerProps = {
  branch: Branch;
  prediction: StoreDemandPrediction;
  maxDemand: number;
  isSelected: boolean;
  onSelect: (branchId: string) => void;
};

export function StoreDemandMarker({
  branch,
  prediction,
  maxDemand,
  isSelected,
  onSelect,
}: StoreDemandMarkerProps) {
  const size = Math.round(26 + 18 * Math.sqrt(prediction.predictedDailyDemand / Math.max(1, maxDemand)));
  const risk = RISK_PRESENTATION[prediction.risk];
  const markerNumber = branch.id.replace("S", "");
  const icon = useMemo(
    () => divIcon({
      className: "store-demand-marker",
      html: `<span class="store-demand-marker__dot${isSelected ? " store-demand-marker__dot--selected" : ""}" style="--marker-fill:${risk.color};--marker-soft:${risk.softColor};width:${size}px;height:${size}px"><span>${markerNumber}</span></span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    }),
    [isSelected, markerNumber, risk.color, risk.softColor, size],
  );
  const eventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      click: () => onSelect(branch.id),
      keydown: (event) => {
        const { key } = event.originalEvent;
        if (key !== "Enter" && key !== " ") return;
        event.originalEvent.preventDefault();
        onSelect(branch.id);
      },
    }),
    [branch.id, onSelect],
  );

  return (
    <Marker
      position={[branch.lat, branch.lng]}
      icon={icon}
      title={`${branch.name}: ${risk.label}`}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={eventHandlers}
    >
      <Tooltip
        direction="top"
        offset={[0, -size / 2]}
        opacity={1}
        className="store-demand-tooltip"
      >
        <div className="min-w-44">
          <p className="font-semibold text-ink">{branch.name}</p>
          <p className="mt-0.5 text-[11px] text-ink-secondary">{ZONE_LABELS[branch.zoneType]}</p>
          <div className="mt-2 flex items-center justify-between gap-4 text-xs">
            <span>{formatInteger(prediction.predictedDailyDemand)} units/day</span>
            <strong style={{ color: risk.color }}>{formatSignedPercent(prediction.upliftPct)}</strong>
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}
