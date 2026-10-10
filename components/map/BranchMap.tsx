"use client";

import L from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import { copy } from "@/lib/copy";
import { heatColor } from "@/lib/heat";
import type { Branch, BranchHeat } from "@/types";

const SALTILLO: [number, number] = [25.4383, -100.9737];

const starIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:22px;line-height:22px;color:#101828;text-shadow:0 0 3px #fff,0 0 3px #fff">★</div>',
  iconSize: [22, 22],
  iconAnchor: [11, 38],
});

// Heat is rendered as sized/colored radial markers (no heat plugin dependency).
export default function BranchMap({
  branches,
  heat,
  selectedId,
  topBranchId,
  onSelect,
}: {
  branches: Branch[];
  heat: BranchHeat[];
  selectedId: string | "all";
  topBranchId: string | null;
  onSelect: (branchId: string) => void;
}) {
  return (
    <MapContainer center={SALTILLO} zoom={11} scrollWheelZoom={false} className="h-[380px] w-full bg-[#E9EEEC]" aria-label={copy.dashboard.analysis.mapTitle}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {branches.map((b) => {
        const h = heat.find((x) => x.branchId === b.id);
        const movement = h?.movement ?? 0;
        const selected = selectedId === b.id;
        return (
          <CircleMarker
            key={b.id}
            center={[b.lat, b.lng]}
            radius={14 + movement * 0.28}
            pathOptions={{
              color: selected ? "#101828" : "#ffffff",
              weight: selected ? 3 : 1.5,
              fillColor: heatColor(movement),
              fillOpacity: 0.85,
            }}
            eventHandlers={{ click: () => onSelect(b.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <strong>{b.name}</strong>
              <br />
              {copy.dashboard.analysis.movement}: {movement}
            </Tooltip>
          </CircleMarker>
        );
      })}
      {topBranchId && (() => {
        const b = branches.find((x) => x.id === topBranchId);
        return b ? (
          <Marker position={[b.lat, b.lng]} icon={starIcon} interactive={false} />
        ) : null;
      })()}
    </MapContainer>
  );
}
