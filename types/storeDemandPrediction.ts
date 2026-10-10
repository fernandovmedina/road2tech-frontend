export type DemandRisk = "healthy" | "watch" | "critical";

export type StoreDemandPrediction = {
  branchId: string;
  productId: string;
  currentDailyDemand: number;
  predictedDailyDemand: number;
  upliftPct: number;
  confidence: number;
  inventoryUnits: number;
  daysOfCover: number;
  recommendedExtraUnits: number;
  risk: DemandRisk;
  reasons: readonly string[];
};
