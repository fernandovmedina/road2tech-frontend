import {
  divIcon,
  type LatLngTuple,
  type LeafletEventHandlerFnMap,
  type Marker as LeafletMarker,
  type Tooltip as LeafletTooltip,
} from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Marker, Tooltip } from "react-leaflet";
import type { LabelSide, OpportunityPoint } from "@/lib/opportunities/presentation";
import { type BubbleLabelMode, EventBubble } from "./EventBubble";

type EventPointLayerProps = {
  point: OpportunityPoint;
  isSelected: boolean;
  labelSide: LabelSide | null;
  labelMode: BubbleLabelMode;
  onSelect: (eventId: string) => void;
};

export function EventPointLayer({
  point,
  isSelected,
  labelSide,
  labelMode,
  onSelect,
}: EventPointLayerProps) {
  const markerRef = useRef<LeafletMarker>(null);
  const tooltipRef = useRef<LeafletTooltip>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isHighlighted = isHovered || isFocused;
  const { lat, lng } = point.position;
  const size = point.diameterPx;

  const center = useMemo<LatLngTuple>(() => [lat, lng], [lat, lng]);
  // Transparent, keyboard-focusable hit area; the visible bubble is the tooltip content.
  const hitArea = useMemo(
    () =>
      divIcon({
        className: "opportunity-hit-area",
        html: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [size],
  );
  const eventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      click: () => onSelect(point.eventId),
      // Leaflet 1.9 only opens popups on Enter, so handle keyboard selection here.
      keydown: (event) => {
        const { key } = event.originalEvent;
        if (key !== "Enter" && key !== " ") return;
        event.originalEvent.preventDefault();
        onSelect(point.eventId);
      },
      mouseover: () => setIsHovered(true),
      mouseout: () => setIsHovered(false),
    }),
    [onSelect, point.eventId],
  );

  // Leaflet emits no focus events for markers, so listen on the icon element itself.
  // It is replaced whenever the icon changes, hence the `hitArea` dependency.
  useEffect(() => {
    const element = markerRef.current?.getElement();
    if (!element) return;
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    element.addEventListener("focus", handleFocus);
    element.addEventListener("blur", handleBlur);
    return () => {
      element.removeEventListener("focus", handleFocus);
      element.removeEventListener("blur", handleBlur);
    };
  }, [hitArea]);

  // Tooltips otherwise stack in the order Leaflet added them; keep the active bubble on top.
  useEffect(() => {
    const element = tooltipRef.current?.getElement();
    if (element) element.style.zIndex = isSelected ? "2" : isHighlighted ? "1" : "";
  }, [isSelected, isHighlighted]);

  return (
    <>
      <Circle
        center={center}
        radius={point.influenceRadiusMeters}
        interactive={false}
        pathOptions={{
          color: point.bin.fill,
          weight: isSelected ? 2 : 1.25,
          opacity: isSelected ? 0.95 : 0.6,
          dashArray: "6 6",
          fillColor: point.bin.fill,
          fillOpacity: isSelected ? 0.12 : 0.04,
        }}
      />
      <Marker
        ref={markerRef}
        position={center}
        icon={hitArea}
        title={`${point.name} · ${point.scheduleLabel}`}
        zIndexOffset={isSelected ? 2000 : 1000}
        eventHandlers={eventHandlers}
      >
        <Tooltip ref={tooltipRef} permanent direction="center" opacity={1} className="opportunity-point">
          <EventBubble
            point={point}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            labelSide={labelSide}
            labelMode={labelMode}
          />
        </Tooltip>
      </Marker>
    </>
  );
}
