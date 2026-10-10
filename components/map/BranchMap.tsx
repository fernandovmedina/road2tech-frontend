"use client";

import "./branchMap.css";

import { divIcon, latLng, latLngBounds, type LatLngBounds, type LeafletEventHandlerFnMap, type Map as LeafletMap } from "leaflet";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { displayBranchName } from "@/lib/branding";
import { copy } from "@/lib/copy";
import { DataLegend, type DataLegendItem } from "@/components/ui/DataLegend";
import type { Heat, Store } from "@/types";
import { StoreInfo } from "./StoreInfo";

const A = copy.dashboard.analysis;

// Only used before the first fit; the real view always comes from fitBounds over the stores.
const FALLBACK_CENTER: [number, number] = [25.4383, -100.9737];

const starIcon = divIcon({
  className: "branch-map-marker__star-wrap",
  html: '<span class="branch-map-marker__star" aria-hidden="true">★</span>',
  iconSize: [22, 22],
  iconAnchor: [11, 38],
});

const HEAT_LEGEND: DataLegendItem[] = [
  { color: "var(--color-heat-1)", label: A.legendLow, shape: "dot" },
  { color: "var(--color-heat-2)", label: "", shape: "dot" },
  { color: "var(--color-heat-3)", label: "", shape: "dot" },
  { color: "var(--color-heat-4)", label: "", shape: "dot" },
  { color: "var(--color-heat-5)", label: A.legendHigh, shape: "dot" },
];

/** Index into the heat tokens (1..5) from the backend movement 0..100. Mirrors the `lib/heat.ts` stops. */
function heatToken(movement: number): string {
  const idx = Math.min(4, Math.floor((Math.max(0, Math.min(100, movement)) / 100) * 5)) + 1;
  return `var(--color-heat-${idx})`;
}

function FitBounds({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [map, bounds]);
  return null;
}

function BranchMarker({
  store,
  movement,
  outOfZone,
  selected,
  onSelect,
}: {
  store: Store;
  movement: number;
  outOfZone: boolean;
  selected: boolean;
  onSelect: (storeId: string) => void;
}) {
  const name = displayBranchName(store);
  const size = outOfZone ? 14 : 24 + movement * 0.4;
  const fill = outOfZone ? "var(--color-axis)" : heatToken(movement);
  const icon = useMemo(
    () =>
      divIcon({
        className: "branch-map-marker",
        html: `<span class="branch-map-marker__dot${selected ? " branch-map-marker__dot--selected" : ""}${outOfZone ? " branch-map-marker__dot--muted" : ""}" style="--marker-fill:${fill};width:${size}px;height:${size}px"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [fill, outOfZone, selected, size],
  );
  const eventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      click: () => onSelect(store.store_id),
      keydown: (event) => {
        const { key } = event.originalEvent;
        if (key !== "Enter" && key !== " ") return;
        event.originalEvent.preventDefault();
        onSelect(store.store_id);
      },
    }),
    [onSelect, store.store_id],
  );

  return (
    <Marker
      position={[store.latitude, store.longitude]}
      icon={icon}
      title={name}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={eventHandlers}
    >
      <Tooltip direction="top" offset={[0, -size / 2]}>
        <StoreInfo store={store} movement={movement} />
      </Tooltip>
    </Marker>
  );
}

// Heat is rendered as sized/colored radial markers (no heat plugin dependency).
export default function BranchMap({
  stores,
  heat,
  showStar,
  selectedId,
  zoneStoreIds,
  onSelect,
}: {
  stores: Store[];
  heat: Heat["items"];
  /** Draw the ★ on the `is_top` store (only meaningful when a product is searched). */
  showStar: boolean;
  selectedId: string | "all";
  /** Stores inside the active zone filter, or `null` when there is no zone filter. */
  zoneStoreIds: Set<string> | null;
  onSelect: (storeId: string) => void;
}) {
  // The page can be hidden/re-shown (cacheComponents Activity, Strict Mode): refs detach on hide and Leaflet's map
  // gets destroyed while React keeps the tree. Mounting the map only while the host element is attached rebuilds it
  // fresh on show.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const heatByStore = useMemo(() => new Map(heat.map((h) => [h.store_id, h])), [heat]);
  const bounds = useMemo(() => {
    const focus = zoneStoreIds ? stores.filter((s) => zoneStoreIds.has(s.store_id)) : stores;
    const points = (focus.length ? focus : stores).map((s) => latLng(s.latitude, s.longitude));
    return points.length ? latLngBounds(points) : null;
  }, [stores, zoneStoreIds]);

  const top = showStar ? heat.find((h) => h.is_top) : undefined;
  const topStore = top ? stores.find((s) => s.store_id === top.store_id) : undefined;

  const setMapRef = useCallback((nextMap: LeafletMap | null) => setMap(nextMap), []);
  const resetView = () => {
    if (map && bounds) map.flyToBounds(bounds, { padding: [32, 32], maxZoom: 14, duration: 0.6 });
  };

  return (
    <div ref={setHost} className="relative h-[380px] w-full">
      {host && (
        <MapContainer
          ref={setMapRef}
          center={FALLBACK_CENTER}
          zoom={11}
          scrollWheelZoom={false}
          className="basemap-neutral h-[380px] w-full"
          aria-label={A.mapLabel}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds bounds={bounds} />
          {stores.map((s) => {
            const h = heatByStore.get(s.store_id);
            return (
              <BranchMarker
                key={s.store_id}
                store={s}
                movement={h?.movement ?? 0}
                outOfZone={zoneStoreIds !== null && !zoneStoreIds.has(s.store_id)}
                selected={selectedId === s.store_id}
                onSelect={onSelect}
              />
            );
          })}
          {topStore && <Marker position={[topStore.latitude, topStore.longitude]} icon={starIcon} interactive={false} />}
        </MapContainer>
      )}
      <button
        type="button"
        onClick={resetView}
        disabled={!bounds}
        className="absolute left-3 top-3 z-[1001] inline-flex items-center gap-1.5 rounded-control border border-line bg-card/95 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-card transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        {copy.common.allBranches}
      </button>
      <div className="absolute bottom-3 left-3 z-[1001] rounded-block bg-card/95 px-3 py-2 shadow-card">
        <DataLegend items={HEAT_LEGEND} label={A.movement} />
      </div>
    </div>
  );
}
