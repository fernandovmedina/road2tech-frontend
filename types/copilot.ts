import type { z } from "zod";
import type * as S from "@/lib/api/copilotSchemas";

// Contracts returned by the Copilot agent (mirror of BackendRoad2Tech services/copilot-api domain/models.py), inferred from
// the zod schemas in lib/api/copilotSchemas.ts so validation and types never drift.
// Every number is computed by deterministic backend code; the UI only renders it.

export type RiskLevel = "low" | "medium" | "high";
export type StrategyType = z.infer<typeof S.productSellStrategySchema>["strategy_type"] & string;
export type Objective = z.infer<typeof S.productSellStrategySchema>["objective"];

export type StoreRef = z.infer<typeof S.storeRefSchema>;
export type ProductRef = z.infer<typeof S.productRefSchema>;
export type SupplierRef = z.infer<typeof S.supplierRefSchema>;

export type ProductTendency = z.infer<typeof S.productTendencySchema>;
export type ProductSellStrategy = z.infer<typeof S.productSellStrategySchema>;
export type StrategyCandidate = ProductSellStrategy["candidates"][number];
export type ScenarioPoint = ProductSellStrategy["baseline_series"][number];
export type RestockPlan = z.infer<typeof S.restockPlanSchema>;
export type RestockSuggestion = RestockPlan["suggestions"][number];
export type StoreOverview = z.infer<typeof S.storeOverviewSchema>;
export type Mover = StoreOverview["top_movers_up"][number];
export type Alert = StoreOverview["alerts"][number];
export type DemandByStore = z.infer<typeof S.demandByStoreSchema>;
export type Portfolio = z.infer<typeof S.portfolioSchema>;
export type ProductSearch = z.infer<typeof S.productSearchSchema>;
export type ToolError = z.infer<typeof S.toolErrorSchema>;
export type ToolResult = z.infer<typeof S.toolResultSchema>;

export type ApprovalRequest = z.infer<typeof S.approvalRequestSchema>;
export type ApprovalDecision = { decision: "approve" | "reject" | "later"; note?: string };
export type SeriesPoint = ProductTendency["historical_series"][number];
export type ForecastPoint = ProductTendency["forecast_series"][number];
