"use client";

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { copy } from "@/lib/copy";
import { heatColor } from "@/lib/heat";
import type { Heat, Store } from "@/types";
import { StoreInfo } from "./StoreInfo";

// Only used before the first fit; the real view always comes from fitBounds over the stores.
const FALLBACK_CENTER: [number, number] = [25.4383, -100.9737];

const starIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:22px;line-height:22px;color:#101828;text-shadow:0 0 3px #fff,0 0 3px #fff">★</div>',
  iconSize: [22, 22],
  iconAnchor: [11, 38],
});

const MUTED = { color: "#ffffff", weight: 1, fillColor: "#C4CCC9", fillOpacity: 0.55 };

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [map, bounds]);
  return null;
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

  const heatByStore = useMemo(() => new Map(heat.map((h) => [h.store_id, h])), [heat]);
  const bounds = useMemo(() => {
    const focus = zoneStoreIds ? stores.filter((s) => zoneStoreIds.has(s.store_id)) : stores;
    const points = (focus.length ? focus : stores).map((s) => L.latLng(s.latitude, s.longitude));
    return points.length ? L.latLngBounds(points) : null;
  }, [stores, zoneStoreIds]);

  const top = showStar ? heat.find((h) => h.is_top) : undefined;
  const topStore = top ? stores.find((s) => s.store_id === top.store_id) : undefined;

  return (
    <div ref={setHost} className="h-[380px] w-full bg-[#E9EEEC]">
      {host && (
        <MapContainer
          center={FALLBACK_CENTER}
          zoom={11}
          scrollWheelZoom={false}
          className="h-[380px] w-full bg-[#E9EEEC]"
          aria-label={copy.dashboard.analysis.mapLabel}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds bounds={bounds} />
          {stores.map((s) => {
            const h = heatByStore.get(s.store_id);
            const outOfZone = zoneStoreIds !== null && !zoneStoreIds.has(s.store_id);
            const selected = selectedId === s.store_id;
            const movement = h?.movement ?? 0;
            return (
              <CircleMarker
                key={s.store_id}
                center={[s.latitude, s.longitude]}
                radius={outOfZone ? 7 : 12 + movement * 0.2}
                pathOptions={
                  outOfZone
                    ? MUTED
                    : {
                        color: selected ? "#101828" : "#ffffff",
                        weight: selected ? 3 : 1.5,
                        fillColor: heatColor(movement),
                        fillOpacity: 0.85,
                      }
                }
                eventHandlers={{ click: () => onSelect(s.store_id) }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <StoreInfo store={s} movement={h?.movement} />
                </Tooltip>
              </CircleMarker>
            );
          })}
          {topStore && <Marker position={[topStore.latitude, topStore.longitude]} icon={starIcon} interactive={false} />}
        </MapContainer>
      )}
    </div>
  );
}
