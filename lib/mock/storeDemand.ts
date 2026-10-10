import type { Branch, ZoneType } from "@/types/branch";
import type { Product } from "@/types/product";
import type { StoreDemandPrediction } from "@/types/storeDemandPrediction";

export type BranchProductDemand = {
  product: Product;
  prediction: StoreDemandPrediction;
};

const SIZE_MULTIPLIER = { small: 0.8, medium: 1, large: 1.25 } as const;

const ZONE_CATEGORY_MULTIPLIER: Record<ZoneType, Partial<Record<string, number>>> = {
  residential: { C02: 1.2, C07: 1.35, C09: 1.35, C14: 1.4, C17: 1.3, C19: 1.2 },
  business: { C05: 1.75, C06: 1.85, C08: 1.25, C02: 0.55 },
  school: { C01: 1.25, C03: 1.35, C04: 1.6, C02: 0.12, C12: 0.2 },
  college: { C01: 1.35, C02: 1.5, C03: 1.35, C06: 1.3, C12: 1.25 },
  highway: { C01: 1.55, C03: 1.45, C05: 1.2, C06: 1.35 },
  industrial: { C01: 1.2, C05: 1.55, C06: 1.5, C08: 1.15 },
  shopping_center: { C01: 1.15, C03: 1.25, C04: 1.35, C05: 1.3 },
  hospital: { C05: 1.25, C06: 1.45, C15: 1.7, C17: 1.35, C20: 1.5 },
};

function hash(input: string): number {
  let value = 2166136261;
  for (const character of input) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function zoneFactor(branch: Branch, product: Product): number {
  const primary = ZONE_CATEGORY_MULTIPLIER[branch.zoneType][product.categoryId] ?? 1;
  const secondary = branch.secondaryZoneType
    ? ZONE_CATEGORY_MULTIPLIER[branch.secondaryZoneType][product.categoryId] ?? 1
    : primary;
  return primary * 0.7 + secondary * 0.3;
}

function demandReasons(branch: Branch, product: Product, upliftPct: number): string[] {
  const reasons = [`${branch.zoneType.replace("_", " ")} demand pattern`];
  if (product.weatherSensitivity === "hot") reasons.push("Warm afternoon forecast");
  if (product.weatherSensitivity === "cold") reasons.push("Cool morning forecast");
  if (product.tags.some((tag) => ["beer", "party_snack", "ice", "disposable"].includes(tag))) {
    reasons.push("Weekend and event basket");
  } else if (product.tags.includes("energy") || product.tags.includes("hot_coffee")) {
    reasons.push("Commute-hour uplift");
  } else if (upliftPct >= 20) {
    reasons.push("Above-normal local trend");
  }
  return reasons.slice(0, 3);
}

export function buildStoreDemandPredictions(
  branches: readonly Branch[],
  product: Product,
): StoreDemandPrediction[] {
  return branches.map((branch) => {
    const seed = hash(`${branch.id}:${product.id}`);
    const localVariation = 0.84 + (seed % 33) / 100;
    const currentDailyDemand =
      product.baseDailyDemand * SIZE_MULTIPLIER[branch.sizeCategory] * zoneFactor(branch, product) * localVariation;
    const weatherLift = product.weatherSensitivity === "neutral" ? 0 : 5;
    const upliftPct = 7 + weatherLift + ((seed >>> 5) % 24);
    const predictedDailyDemand = currentDailyDemand * (1 + upliftPct / 100);
    const daysOfCover = 0.8 + ((seed >>> 11) % 39) / 10;
    const inventoryUnits = Math.max(0, Math.round(predictedDailyDemand * daysOfCover));
    const risk = daysOfCover < 1.6 ? "critical" : daysOfCover < 2.8 ? "watch" : "healthy";
    const targetUnits = Math.ceil(predictedDailyDemand * 4);

    return {
      branchId: branch.id,
      productId: product.id,
      currentDailyDemand: Math.round(currentDailyDemand * 10) / 10,
      predictedDailyDemand: Math.round(predictedDailyDemand * 10) / 10,
      upliftPct,
      confidence: (78 + ((seed >>> 17) % 17)) / 100,
      inventoryUnits,
      daysOfCover: Math.round(daysOfCover * 10) / 10,
      recommendedExtraUnits: Math.max(0, targetUnits - inventoryUnits),
      risk,
      reasons: demandReasons(branch, product, upliftPct),
    };
  });
}

export function buildAggregateStoreDemandPredictions(
  branches: readonly Branch[],
  products: readonly Product[],
): StoreDemandPrediction[] {
  if (products.length === 0) return [];

  const predictionsByBranch = new Map<string, StoreDemandPrediction[]>();
  for (const product of products) {
    for (const prediction of buildStoreDemandPredictions(branches, product)) {
      const rows = predictionsByBranch.get(prediction.branchId) ?? [];
      rows.push(prediction);
      predictionsByBranch.set(prediction.branchId, rows);
    }
  }

  return branches.flatMap((branch) => {
    const rows = predictionsByBranch.get(branch.id) ?? [];
    if (rows.length === 0) return [];
    const currentDailyDemand = rows.reduce((sum, row) => sum + row.currentDailyDemand, 0);
    const predictedDailyDemand = rows.reduce((sum, row) => sum + row.predictedDailyDemand, 0);
    const inventoryUnits = rows.reduce((sum, row) => sum + row.inventoryUnits, 0);
    const recommendedExtraUnits = rows.reduce((sum, row) => sum + row.recommendedExtraUnits, 0);
    const daysOfCover = predictedDailyDemand > 0 ? inventoryUnits / predictedDailyDemand : 0;
    const risk = daysOfCover < 1.6 ? "critical" : daysOfCover < 2.8 ? "watch" : "healthy";

    return [{
      branchId: branch.id,
      productId: "all",
      currentDailyDemand: Math.round(currentDailyDemand * 10) / 10,
      predictedDailyDemand: Math.round(predictedDailyDemand * 10) / 10,
      upliftPct: currentDailyDemand > 0 ? Math.round(((predictedDailyDemand / currentDailyDemand) - 1) * 100) : 0,
      confidence: rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length,
      inventoryUnits,
      daysOfCover: Math.round(daysOfCover * 10) / 10,
      recommendedExtraUnits,
      risk,
      reasons: [`${products.length} products included`, `${branch.zoneType.replace("_", " ")} demand pattern`],
    } satisfies StoreDemandPrediction];
  });
}

export function buildBranchProductPredictions(
  branch: Branch,
  products: readonly Product[],
): BranchProductDemand[] {
  const riskPriority = { critical: 2, watch: 1, healthy: 0 } as const;

  return products
    .map((product) => ({
      product,
      prediction: buildStoreDemandPredictions([branch], product)[0],
    }))
    .filter((row): row is BranchProductDemand => row.prediction !== undefined)
    .sort((a, b) =>
      riskPriority[b.prediction.risk] - riskPriority[a.prediction.risk]
      || b.prediction.recommendedExtraUnits - a.prediction.recommendedExtraUnits
      || b.prediction.predictedDailyDemand - a.prediction.predictedDailyDemand)
    .slice(0, 8);
}
