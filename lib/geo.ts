const EARTH_RADIUS_METERS = 6_371_000;

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in meters (haversine formula). */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
