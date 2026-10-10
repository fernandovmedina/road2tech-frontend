export type DemandRisk = "healthy" | "watch" | "critical";

export type StoreDemandPrediction = {
  branchId: string;
  productId: string;
  currentDailyDemand: number;
  predictedDailyDemand: number;
  upliftPct: number;
  confidence: number;
  inventoryUnits: number;
  /** `null` when there is no forecast demand, so coverage is unbounded. */
  daysOfCover: number | null;
  recommendedExtraUnits: number;
  risk: DemandRisk;
  reasons: readonly string[];
};
