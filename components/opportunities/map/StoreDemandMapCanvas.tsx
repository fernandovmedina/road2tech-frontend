"use client";

import "leaflet/dist/leaflet.css";
import "./opportunityMap.css";

import { latLngBounds, type FitBoundsOptions, type LatLngTuple, type Map as LeafletMap } from "leaflet";
import { RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import { copy } from "@/lib/copy";
import type { Branch } from "@/types/branch";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";
import { MapViewportController } from "./MapViewportController";
import { StoreDemandMarker } from "./StoreDemandMarker";
import { StoreMapLegend } from "./StoreMapLegend";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const HOME_FIT: FitBoundsOptions = { paddingTopLeft: [40, 50], paddingBottomRight: [40, 70] };

type StoreDemandMapCanvasProps = {
  branches: readonly Branch[];
  predictions: readonly StoreDemandPrediction[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
};

export function StoreDemandMapCanvas({
  branches,
  predictions,
  selectedBranchId,
  onSelectBranch,
}: StoreDemandMapCanvasProps) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  // MapContainer is rendered only while its host div is attached. React detaches the ref when the screen is
  // hidden (Cache Components keeps previous routes alive) and re-attaches it on return, so Leaflet never
  // sees a container it already initialised ("Map container is being reused by another instance").
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const predictionByBranch = useMemo(
    () => new Map(predictions.map((prediction) => [prediction.branchId, prediction])),
    [predictions],
  );
  const coordinates = useMemo<LatLngTuple[]>(
    () => branches.map((branch) => [branch.lat, branch.lng]),
    [branches],
  );
  const homeBounds = useMemo(() => latLngBounds(coordinates).pad(0.05), [coordinates]);
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null;
  const maxDemand = Math.max(1, ...predictions.map((prediction) => prediction.predictedDailyDemand));
  const setMapRef = useCallback((nextMap: LeafletMap | null) => setMap(nextMap), []);

  return (
    <div ref={setHost} className="relative size-full">
      {host && (
        <MapContainer
          ref={setMapRef}
          bounds={homeBounds}
          boundsOptions={HOME_FIT}
          zoomSnap={0.25}
          zoomControl={false}
          scrollWheelZoom
          className="opportunity-map basemap-neutral size-full"
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <ZoomControl position="topright" />
          {branches.map((branch) => {
            const prediction = predictionByBranch.get(branch.id);
            return prediction ? (
              <StoreDemandMarker
                key={branch.id}
                branch={branch}
                prediction={prediction}
                maxDemand={maxDemand}
                isSelected={branch.id === selectedBranchId}
                onSelect={onSelectBranch}
              />
            ) : null;
          })}
          <MapViewportController
            focus={selectedBranch ? { lat: selectedBranch.lat, lng: selectedBranch.lng, radiusMeters: 800 } : null}
          />
        </MapContainer>
      )}
      <button
        type="button"
        onClick={() => map?.flyToBounds(homeBounds, { ...HOME_FIT, duration: 0.6 })}
        className="absolute left-3 top-3 z-[1001] inline-flex items-center gap-1.5 rounded-control border border-line bg-card/95 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {copy.opportunities.map.showAllStores}
      </button>
      <StoreMapLegend />
    </div>
  );
}
