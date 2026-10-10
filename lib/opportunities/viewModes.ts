import type { DemandEvent } from "@/types/demandEvent";

export const VIEW_MODES = ["normal_day", "upcoming", "special", "comparison"] as const;

export type OpportunityViewMode = (typeof VIEW_MODES)[number];

export const VIEW_MODE_LABELS: Record<OpportunityViewMode, string> = {
  normal_day: "Normal day",
  upcoming: "Upcoming events",
  special: "Special events",
  comparison: "Scenario comparison",
};

/** Finals, semifinals and important events: the ones that break the normal pattern. */
export function isSpecialEvent(event: Pick<DemandEvent, "importance">): boolean {
  return event.importance !== "regular";
}
