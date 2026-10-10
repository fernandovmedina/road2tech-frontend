import { z } from "zod";

// Results the LangGraph agent (BackendRoad2Tech/services/copilot-api, domain/models.py) returns from its tools. Each one
// is a JSON string with a `kind` discriminator that the chat validates here before drawing anything: a result that does
// not match becomes the error card, never an exception and never HTML. Field names match the agent exactly; the discount
// the agent sends as 1-60 (`discount_pct`) keeps that unit and the UI only formats it. types/copilot.ts infers from here.

const isoDate = z.string();
const riskLevel = z.enum(["low", "medium", "high"]);
const strategyType = z.enum(["contextual_discount", "rescue_combo", "affinity_combo"]);

export const storeRefSchema = z.object({
  store_id: z.string(),
  store_name: z.string(),
  colonia: z.string(),
  zone_type: z.string(),
  secondary_zone_type: z.string().nullable(),
  size_category: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export const productRefSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  brand: z.string(),
  unit: z.string(),
  retail_price: z.number(),
  shelf_life_days: z.number(),
  is_perishable: z.boolean(),
  weather_sensitivity: z.string(),
});

export const supplierRefSchema = z.object({
  supplier_id: z.string(),
  supplier_name: z.string(),
  email: z.string(),
  city: z.string(),
  reliability_score: z.number(),
});

const seriesPoint = z.object({ date: isoDate, value: z.number() });
const forecastPoint = z.object({ date: isoDate, p50: z.number(), p80: z.number(), p90: z.number() });
const driver = z.object({ kind: z.string(), name: z.string(), impact_pct: z.number(), detail: z.string() });

const stockoutRisk = z.object({
  level: riskLevel,
  score: z.number(),
  days_of_cover: z.number().nullable(),
  first_stockout_date: isoDate.nullable(),
  expected_lost_units: z.number(),
  detail: z.string(),
});

const wasteRisk = z.object({
  level: riskLevel,
  score: z.number(),
  expiring_units: z.number(),
  expected_waste_units: z.number(),
  expected_waste_value: z.number(),
  detail: z.string(),
});

export const productTendencySchema = z.object({
  kind: z.literal("product_tendency"),
  store: storeRefSchema,
  product: productRefSchema,
  data_as_of: isoDate,
  history_days: z.number(),
  forecast_days: z.number(),
  historical_series: z.array(seriesPoint),
  forecast_series: z.array(forecastPoint),
  trend: z.enum(["increasing", "stable", "decreasing"]),
  trend_strength: z.number(),
  trend_pct_per_week: z.number(),
  recent_avg_daily_units: z.number(),
  forecast_avg_daily_units: z.number(),
  forecast_vs_recent_pct: z.number(),
  main_drivers: z.array(driver),
  stockout_risk: stockoutRisk,
  waste_risk: wasteRisk,
  inventory: z.object({
    on_hand: z.number(),
    in_transit: z.number(),
    next_delivery_date: isoDate.nullable(),
    lots: z.array(z.object({ expiration_date: isoDate, quantity: z.number() })),
  }),
  model: z.object({ name: z.string(), backtest_wape_14d: z.number().nullable(), source: z.string() }),
  ai_summary: z.string(),
});

const scenarioPoint = z.object({
  date: isoDate,
  units: z.number(),
  revenue: z.number(),
  waste_units: z.number(),
  in_promotion: z.boolean(),
});

const strategyCandidate = z.object({
  candidate_id: z.string(),
  strategy_type: strategyType,
  title: z.string(),
  discount_pct: z.number(),
  cross_sell_product: productRefSchema.nullable(),
  expected_units_increment: z.number(),
  expected_sales_increment: z.number(),
  expected_margin_increment: z.number(),
  expected_waste_reduction: z.number(),
  expected_net_impact: z.number(),
  stockout_risk: riskLevel,
  viable: z.boolean(),
  violations: z.array(z.string()),
});

export const productSellStrategySchema = z.object({
  kind: z.literal("product_sell_strategy"),
  store: storeRefSchema,
  product: productRefSchema,
  data_as_of: isoDate,
  objective: z.enum(["increase_sales", "reduce_waste", "maximize_margin"]),
  recommended_action: z.string(),
  strategy_type: strategyType.nullable(),
  discount_pct: z.number(),
  cross_sell_product: productRefSchema.nullable(),
  cross_sell_basis: z.string().nullable(),
  valid_from: isoDate,
  valid_to: isoDate,
  baseline_series: z.array(scenarioPoint),
  strategy_series: z.array(scenarioPoint),
  expected_units_increment: z.number(),
  expected_sales_increment: z.number(),
  expected_margin_increment: z.number(),
  expected_waste_reduction: z.number(),
  expected_waste_reduction_value: z.number(),
  expected_net_impact: z.number(),
  stockout_risk: riskLevel,
  confidence_interval: z.object({ low: z.number(), high: z.number(), metric: z.string(), basis: z.string() }),
  constraints: z.object({
    max_discount_pct: z.number(),
    min_unit_margin_pct: z.number(),
    budget_mxn: z.number(),
    period_days: z.number(),
    max_stockout_risk: riskLevel,
  }),
  assumptions: z.array(z.string()),
  candidates: z.array(strategyCandidate),
  draft_id: z.string().nullable(),
  draft_status: z.enum(["draft", "selected", "approved", "rejected"]).nullable(),
  requires_approval: z.boolean(),
  expected_anchor_units_increment: z.number(),
  uplift_source: z.enum(["campaigns", "assumed"]),
  disclaimer: z.string(),
});

const restockSuggestion = z.object({
  id: z.string(),
  store_id: z.string(),
  product: productRefSchema,
  supplier: supplierRefSchema,
  suggested_qty: z.number(),
  order_date: isoDate,
  expected_arrival_date: isoDate,
  lead_time_days: z.number(),
  unit_cost: z.number(),
  order_cost: z.number(),
  is_urgent: z.boolean(),
  on_hand: z.number(),
  in_transit: z.number(),
  predicted_daily_demand: z.number(),
  days_of_cover: z.number().nullable(),
  reorder_point: z.number(),
  reasons: z.array(z.enum(["stock_limit", "demand", "season"])),
  reason_details: z.array(z.string()),
  status: z.enum(["pending", "approved", "dismissed"]),
  email_draft: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
});

export const restockPlanSchema = z.object({
  kind: z.literal("restock_plan"),
  store: storeRefSchema,
  data_as_of: isoDate,
  checked_products: z.number(),
  suggestions: z.array(restockSuggestion),
  notes: z.array(z.string()),
});

const mover = z.object({
  product: productRefSchema,
  recent_units: z.number(),
  previous_units: z.number(),
  change_pct: z.number(),
});

const alert = z.object({
  kind: z.enum(["run_out", "expiration", "demand_spike", "no_demand"]),
  severity: riskLevel,
  product_id: z.string(),
  product_name: z.string(),
  date: isoDate.nullable(),
  message: z.string(),
});

export const storeOverviewSchema = z.object({
  kind: z.literal("store_overview"),
  store: storeRefSchema,
  data_as_of: isoDate,
  period_from: isoDate,
  period_to: isoDate,
  kpis: z.object({
    total_sales: z.number(),
    total_sales_previous: z.number(),
    sales_change_pct: z.number(),
    units_sold: z.number(),
    run_outs: z.number(),
    no_demand: z.number(),
    waste_risk_products: z.number(),
  }),
  daily_sales: z.array(seriesPoint),
  top_movers_up: z.array(mover),
  top_movers_down: z.array(mover),
  alerts: z.array(alert),
});

export const demandByStoreSchema = z.object({
  kind: z.literal("demand_by_store"),
  product: productRefSchema,
  data_as_of: isoDate,
  days: z.number(),
  network_recent_units: z.number(),
  stores: z.array(
    z.object({
      store: storeRefSchema,
      recent_units: z.number(),
      previous_units: z.number(),
      change_pct: z.number(),
      forecast_next_7d_units: z.number(),
    }),
  ),
});

export const portfolioSchema = z.object({
  kind: z.literal("portfolio"),
  store: storeRefSchema,
  data_as_of: isoDate,
  period_from: isoDate,
  period_to: isoDate,
  strategies: z.array(productSellStrategySchema),
  net_expected_margin_increment: z.number(),
  net_expected_impact: z.number(),
  conflicts: z.array(z.string()),
  skipped: z.array(z.string()),
});

export const productSearchSchema = z.object({
  kind: z.literal("product_search"),
  query: z.string(),
  products: z.array(productRefSchema),
});

export const toolErrorSchema = z.object({ kind: z.literal("error"), message: z.string() });

export const toolResultSchema = z.discriminatedUnion("kind", [
  productTendencySchema,
  productSellStrategySchema,
  restockPlanSchema,
  storeOverviewSchema,
  demandByStoreSchema,
  portfolioSchema,
  productSearchSchema,
  toolErrorSchema,
]);

/** The `interrupt()` payload the agent raises after it saves a promotion draft (`promotion_approval`). */
export const approvalRequestSchema = z.object({
  type: z.literal("promotion_approval"),
  draft_id: z.string(),
  title: z.string(),
  store_name: z.string(),
  product_name: z.string(),
  valid_from: isoDate,
  valid_to: isoDate,
  discount_pct: z.number(),
  expected_net_impact: z.number(),
  expected_sales_increment: z.number(),
  expected_waste_reduction: z.number(),
  confidence_low: z.number(),
  confidence_high: z.number(),
  stockout_risk: riskLevel,
});
