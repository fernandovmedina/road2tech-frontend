export type ZoneType =
  | "residential"
  | "business"
  | "school"
  | "college"
  | "highway"
  | "industrial"
  | "shopping_center"
  | "hospital";

export type BranchSize = "small" | "medium" | "large";

/** A Saltillo store location, aligned with the synthetic backend v2 dataset. */
export type Branch = {
  id: string;
  name: string;
  colonia: string;
  lat: number;
  lng: number;
  zoneType: ZoneType;
  secondaryZoneType: ZoneType | null;
  sizeCategory: BranchSize;
  is24h: boolean;
};
