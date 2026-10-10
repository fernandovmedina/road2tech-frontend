"use client";

import "leaflet/dist/leaflet.css";
import "./opportunityMap.css";

import {
  type FitBoundsOptions,
  type LatLngBoundsExpression,
  type LatLngTuple,
  latLngBounds,
  type Map as LeafletMap,
} from "leaflet";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import { copy } from "@/lib/copy";
import type { LabelSide, OpportunityPoint } from "@/lib/opportunities/presentation";
import type { Branch } from "@/types/branch";
import { BranchLayer } from "./BranchLayer";
import type { BubbleLabelMode } from "./EventBubble";
import { EventPointLayer } from "./EventPointLayer";
import { LabelPlacement } from "./LabelPlacement";
import { MapLegend } from "./MapLegend";
import { MapViewportController } from "./MapViewportController";

// OpenStreetMap tiles (no API key) are the only network resource; all event and
// demand data is simulated locally.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SALTILLO_BOUNDS: LatLngBoundsExpression = [
  [25.37, -101.05],
  [25.49, -100.94],
];
// Extra room for the "Reset view" button (top) and the legend row (bottom).
const HOME_FIT: FitBoundsOptions = { paddingTopLeft: [24, 48], paddingBottomRight: [24, 56] };

/**
 * With cacheComponents, Next.js hides routes in <Activity> and tears their effects down.
 * react-leaflet's MapContainer removes its map on cleanup and never rebuilds it,
 * so give it a fresh key whenever that happens.
 */
function useRemountKey(): number {
  const [key, setKey] = useState(0);
  useEffect(() => () => setKey((current) => current + 1), []);
  return key;
}

type OpportunityMapCanvasProps = {
  points: readonly OpportunityPoint[];
  branches: readonly Branch[];
  selectedEventId: string | null;
  affectedBranchIds: ReadonlySet<string>;
  labelMode: BubbleLabelMode;
  showBranchLabels: boolean;
  showEventLegend: boolean;
  maxExtraSalesMxn: number;
  onSelectEvent: (eventId: string) => void;
};

export function OpportunityMapCanvas({
  points,
  branches,
  selectedEventId,
  affectedBranchIds,
  labelMode,
  showBranchLabels,
  showEventLegend,
  maxExtraSalesMxn,
  onSelectEvent,
}: OpportunityMapCanvasProps) {
  const mapKey = useRemountKey();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [labelSides, setLabelSides] = useState<ReadonlyMap<string, LabelSide>>(() => new Map());

  // Bail out when the placement is unchanged, so map moves don't re-render every point.
  const handleLabelsChange = useCallback((next: ReadonlyMap<string, LabelSide>) => {
    setLabelSides((current) =>
      current.size === next.size && [...next].every(([eventId, side]) => current.get(eventId) === side)
        ? current
        : next,
    );
  }, []);

  const homeBounds = useMemo<LatLngBoundsExpression>(() => {
    const coordinates: LatLngTuple[] = [
      ...branches.map((branch): LatLngTuple => [branch.lat, branch.lng]),
      ...points.map((point): LatLngTuple => [point.position.lat, point.position.lng]),
    ];
    return coordinates.length > 0 ? latLngBounds(coordinates).pad(0.02) : SALTILLO_BOUNDS;
  }, [branches, points]);

  const selectedPoint = points.find((point) => point.eventId === selectedEventId);
  const focus = selectedPoint
    ? {
        lat: selectedPoint.position.lat,
        lng: selectedPoint.position.lng,
        radiusMeters: selectedPoint.influenceRadiusMeters,
      }
    : null;

  return (
    <div className="relative size-full">
      <MapContainer
        key={mapKey}
        ref={setMap}
        bounds={homeBounds}
        boundsOptions={HOME_FIT}
        zoomSnap={0.25}
        zoomControl={false}
        scrollWheelZoom
        className="opportunity-map basemap-neutral size-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} subdomains="abcd" maxZoom={19} />
        <ZoomControl position="topright" />
        <BranchLayer
          branches={branches}
          affectedBranchIds={affectedBranchIds}
          showLabels={showBranchLabels}
        />
        {points.map((point) => (
          <EventPointLayer
            key={point.eventId}
            point={point}
            isSelected={point.eventId === selectedEventId}
            labelSide={labelSides.get(point.eventId) ?? null}
            labelMode={labelMode}
            onSelect={onSelectEvent}
          />
        ))}
        <LabelPlacement
          points={points}
          branches={branches}
          selectedEventId={selectedEventId}
          onChange={handleLabelsChange}
        />
        <MapViewportController focus={focus} />
      </MapContainer>

      <button
        type="button"
        onClick={() => map?.flyToBounds(homeBounds, { ...HOME_FIT, duration: 0.6 })}
        className="absolute left-3 top-3 z-[1001] inline-flex items-center gap-1.5 rounded-control border border-line bg-card/95 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {copy.opportunities.map.resetView}
      </button>

      <MapLegend showEventKeys={showEventLegend} maxExtraSalesMxn={maxExtraSalesMxn} />
    </div>
  );
}
