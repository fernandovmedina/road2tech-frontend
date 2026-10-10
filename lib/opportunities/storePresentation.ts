import type { ZoneType } from "@/types/branch";
import type { DemandRisk } from "@/types/storeDemandPrediction";

export const ZONE_LABELS: Record<ZoneType, string> = {
  residential: "Residential",
  business: "Business",
  school: "School",
  college: "College",
  highway: "Highway",
  industrial: "Industrial",
  shopping_center: "Shopping center",
  hospital: "Hospital",
};

export const RISK_PRESENTATION: Record<
  DemandRisk,
  { label: string; color: string; softColor: string }
> = {
  healthy: { label: "Stock covered", color: "#16785f", softColor: "#d9f0e8" },
  watch: { label: "Watch stock", color: "#b46a09", softColor: "#fff0d2" },
  critical: { label: "Restock now", color: "#c63f3f", softColor: "#fbe2e2" },
};

export function readableTag(tag: string): string {
  return tag.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
