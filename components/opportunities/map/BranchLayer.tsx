import { divIcon } from "leaflet";
import { Marker, Pane, Tooltip } from "react-leaflet";
import type { Branch } from "@/types/branch";

// Above Leaflet's tooltip pane (650), where the event bubbles live, so a branch
// next to a venue is never hidden under its bubble.
const BRANCH_PANE_Z_INDEX = 655;

function createBranchIcon(isAffected: boolean) {
  const modifier = isAffected ? " branch-marker__dot--affected" : "";
  return divIcon({
    className: "branch-marker",
    html: `<span class="branch-marker__dot${modifier}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const BRANCH_ICON = createBranchIcon(false);
const AFFECTED_BRANCH_ICON = createBranchIcon(true);

type BranchLayerProps = {
  branches: readonly Branch[];
  affectedBranchIds: ReadonlySet<string>;
  showLabels: boolean;
};

export function BranchLayer({ branches, affectedBranchIds, showLabels }: BranchLayerProps) {
  return (
    <Pane name="branches" style={{ zIndex: BRANCH_PANE_Z_INDEX }}>
      {branches.map((branch) => (
        <Marker
          key={branch.id}
          position={[branch.lat, branch.lng]}
          icon={affectedBranchIds.has(branch.id) ? AFFECTED_BRANCH_ICON : BRANCH_ICON}
          keyboard={false}
        >
          {/* Tooltip options are fixed at creation, so re-key it when switching label modes. */}
          <Tooltip
            key={showLabels ? "permanent" : "hover"}
            permanent={showLabels}
            direction="top"
            offset={[0, -8]}
            className="branch-label"
          >
            {branch.name}
          </Tooltip>
        </Marker>
      ))}
    </Pane>
  );
}
