import type {
  BaselineDemandProfile,
  DemandScenarios,
  EventPrediction,
} from "@/types/eventPrediction";
import type { Weekday } from "@/types/weekday";

export type BaselineRow = { productId: string; productName: string; changePct: number };

/** Scenario 1 for one weekday: normal-day change per product, no events. */
export function buildBaselineRows(
  profiles: readonly BaselineDemandProfile[],
  weekday: Weekday,
  productNames: ReadonlyMap<string, string>,
): BaselineRow[] {
  return profiles.map((profile) => ({
    productId: profile.productId,
    productName: productNames.get(profile.productId) ?? profile.productId,
    changePct: profile.changeByWeekday[weekday],
  }));
}

/** Percentage points of demand caused by the event alone (scenario 2 − scenario 1). */
export function eventEffectPp(scenarios: DemandScenarios): number {
  return scenarios.withEventPct - scenarios.normalDayPct;
}

export type ScenarioRow = {
  productId: string;
  productName: string;
  scenarios: DemandScenarios;
  effectPp: number;
  recommendedExtraUnits: number;
  expectedExtraSalesMxn: number;
};

/** One row per impacted product, highest expected extra sales first. */
export function buildScenarioRows(
  prediction: EventPrediction,
  productNames: ReadonlyMap<string, string>,
): ScenarioRow[] {
  return prediction.productImpacts.map((impact) => ({
    productId: impact.productId,
    productName: productNames.get(impact.productId) ?? impact.productId,
    scenarios: impact.scenarios,
    effectPp: eventEffectPp(impact.scenarios),
    recommendedExtraUnits: impact.recommendedExtraUnits,
    expectedExtraSalesMxn: impact.expectedExtraSalesMxn,
  }));
}

export type ConfidenceLevel = "high" | "medium" | "low";

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}
