import { latLng } from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

type MapFocus = { lat: number; lng: number; radiusMeters: number };

/** Keeps the map sized to its card and brings the selected influence area into view. */
export function MapViewportController({ focus }: { focus: MapFocus | null }) {
  const map = useMap();

  // Leaflet only reacts to window resizes; grid and panel changes resize the map too.
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  const lat = focus?.lat;
  const lng = focus?.lng;
  const radiusMeters = focus?.radiusMeters;

  useEffect(() => {
    if (lat === undefined || lng === undefined || radiusMeters === undefined) return;
    const influenceArea = latLng(lat, lng).toBounds(radiusMeters * 2);
    if (!map.getBounds().contains(influenceArea)) {
      map.flyToBounds(influenceArea, { padding: [32, 32], maxZoom: 14, duration: 0.6 });
    }
  }, [map, lat, lng, radiusMeters]);

  return null;
}
