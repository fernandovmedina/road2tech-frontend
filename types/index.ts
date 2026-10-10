import type { z } from "zod";
import type * as S from "@/lib/api/schemas";

// Domain types are inferred from the API schemas (lib/api/schemas.ts) so mock, backend and UI never drift.

export type AuthUser = { id: string; name: string; email: string };
export type Session = { token: string; user: AuthUser };

export type Store = z.infer<typeof S.storeSchema>;
export type Category = z.infer<typeof S.categorySchema>;
export type Zone = z.infer<typeof S.zoneSchema>;
export type Meta = z.infer<typeof S.metaSchema>;
export type Product = z.infer<typeof S.productSchema>;
export type Supplier = z.infer<typeof S.supplierSchema>;
export type SupplierOffer = z.infer<typeof S.supplierOfferSchema>;

export type KpiSet = z.infer<typeof S.kpiSetSchema>;
export type ChainSummary = z.infer<typeof S.chainSummarySchema>;
export type StoreKpis = z.infer<typeof S.storeKpisSchema>;
export type Heat = z.infer<typeof S.heatSchema>;
export type Behavior = z.infer<typeof S.behaviorSchema>;
export type Tendency = z.infer<typeof S.tendencySchema>;

export type StockStatus = z.infer<typeof S.stockStatusSchema>;
export type StockItem = z.infer<typeof S.stockItemSchema>;
export type StockSummary = z.infer<typeof S.stockSummarySchema>;
export type PolicyItem = z.infer<typeof S.policyItemSchema>;
export type PolicySuggestion = z.infer<typeof S.policySuggestionSchema>;

export type RestockReason = z.infer<typeof S.restockReasonSchema>;
export type RestockSuggestion = z.infer<typeof S.restockSuggestionSchema>;
export type RestockOrder = z.infer<typeof S.restockOrderSchema>;
export type TestEmailResult = z.infer<typeof S.testEmailSchema>;

export type CalendarEvent = z.infer<typeof S.calendarEventSchema>;
export type CalendarContext = z.infer<typeof S.calendarContextSchema>;
export type Calendar = z.infer<typeof S.calendarSchema>;

export type StrategyStatus = z.infer<typeof S.strategyStatusSchema>;
export type StrategyType = z.infer<typeof S.strategyTypeSchema>;
export type StrategyDriver = z.infer<typeof S.strategyDriverSchema>;
export type Strategy = z.infer<typeof S.strategySchema>;
export type DiscountPoint = z.infer<typeof S.discountPointSchema>;
export type StrategyDetail = z.infer<typeof S.strategyDetailSchema>;
export type Portfolio = z.infer<typeof S.portfolioSchema>;
export type Plan = z.infer<typeof S.planSchema>;
export type StrategyAction = z.infer<typeof S.strategyActionSchema>;

export type ChatTool = z.infer<typeof S.chatToolSchema>;
export type ChatBlock = z.infer<typeof S.chatBlockSchema>;
export type ChatResponse = z.infer<typeof S.chatResponseSchema>;
/** One entry of the conversation kept in the UI. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  tools?: ChatTool[];
  constraints?: ChatResponse["interpreted_constraints"];
  blocks: ChatBlock[];
  error?: boolean;
};

// UI-only types
export type DataMode = "actual" | "forecast";
export type RangeKey = "last7" | "last30" | "next14" | "next30";
export type DemoState = "normal" | "empty" | "error";
export type Page<T> = { items: T[]; page: number; page_size: number; total: number };
