import type { Weekday } from "./weekday";

/**
 * The two scenarios the model compares, both as % change versus an
 * average day for the same product.
 */
export type DemandScenarios = {
  /** Scenario 1 — a normal day: same weekday, no event. */
  normalDayPct: number;
  /** Scenario 2 — the same day adjusted by the event. */
  withEventPct: number;
};

export type ProductDemandImpact = {
  productId: string;
  scenarios: DemandScenarios;
  /** Extra units to stock across affected branches, on top of a normal day. */
  recommendedExtraUnits: number;
  expectedExtraSalesMxn: number;
};

export type AffectedBranch = {
  branchId: string;
  distanceMeters: number;
};

/** Model output for one event, kept apart from the event data itself. */
export type EventPrediction = {
  eventId: string;
  /** Weekday whose normal-day baseline the event is compared against. */
  baselineWeekday: Weekday;
  influenceRadiusMeters: number;
  affectedBranches: AffectedBranch[];
  /** Sorted by expected extra sales, highest first. */
  productImpacts: ProductDemandImpact[];
  /** Revenue-weighted scenarios across all impacted products. */
  overallScenarios: DemandScenarios;
  expectedExtraSalesMxn: number;
  /** 0–1 */
  confidence: number;
};

/** Normal-day demand for one product: % change vs. an average day, per weekday. */
export type BaselineDemandProfile = {
  productId: string;
  changeByWeekday: Record<Weekday, number>;
};
