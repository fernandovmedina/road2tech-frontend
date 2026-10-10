import { useEffect } from "react";
import { useMap } from "react-leaflet";
import {
  boxAt,
  type LabelSide,
  type OpportunityPoint,
  placeLabels,
} from "@/lib/opportunities/presentation";
import type { Branch } from "@/types/branch";

// Bands kept free for the "Reset view" button (top) and the legend row (bottom).
const RESERVED_TOP_PX = 44;
const RESERVED_BOTTOM_PX = 56;
// Branch markers are 14px squares; keep labels a few pixels clear of them.
const BRANCH_CLEARANCE_PX = 18;

type LabelPlacementProps = {
  points: readonly OpportunityPoint[];
  branches: readonly Branch[];
  selectedEventId: string | null;
  onChange: (labelSides: ReadonlyMap<string, LabelSide>) => void;
};

/** Recomputes which event labels fit whenever the map moves, zooms or resizes. */
export function LabelPlacement({ points, branches, selectedEventId, onChange }: LabelPlacementProps) {
  const map = useMap();

  useEffect(() => {
    const update = () => {
      const positions = new Map(
        points.map((point) => {
          const { x, y } = map.latLngToContainerPoint([point.position.lat, point.position.lng]);
          return [point.eventId, { x, y }] as const;
        }),
      );
      const branchBoxes = branches.map((branch) => {
        const { x, y } = map.latLngToContainerPoint([branch.lat, branch.lng]);
        const half = BRANCH_CLEARANCE_PX / 2;
        return boxAt(x - half, y - half, BRANCH_CLEARANCE_PX, BRANCH_CLEARANCE_PX);
      });
      const size = map.getSize();
      onChange(
        placeLabels(
          points,
          positions,
          selectedEventId,
          { left: 0, top: RESERVED_TOP_PX, right: size.x, bottom: size.y - RESERVED_BOTTOM_PX },
          branchBoxes,
        ),
      );
    };
    map.whenReady(update);
    map.on("zoomend moveend resize", update);
    return () => {
      map.off("zoomend moveend resize", update);
    };
  }, [map, points, branches, selectedEventId, onChange]);

  return null;
}
