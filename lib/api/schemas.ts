import { z } from "zod";
import { isoDate } from "./envelope";

// Domain schemas = the API contract (docs/backend-contract.md). Field names stay snake_case exactly like the
// API so there is no mapping layer. Types are inferred in /types. Mock and real responses share these schemas.

const money = z.number();
const fraction = z.number(); // 0..1
const ci = z.object({ low: money, high: money, level: z.number() });
const period = z.object({ from: isoDate, to: isoDate });

/* ---------- catalogs ---------- */

export const storeSchema = z.object({
  store_id: z.string(),
  store_name: z.string(),
  colonia: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  zone_type: z.string(),
  secondary_zone_type: z.string().nullable(),
  size_category: z.string(),
  opening_hours: z.string(),
  is_24h: z.number(),
  opened_date: isoDate,
});

export const categorySchema = z.object({
  category_id: z.string(),
  category_name: z.string(),
  is_perishable: z.number(),
  typical_shelf_life_days: z.number(),
  requires_refrigeration: z.number(),
});

export const zoneSchema = z.object({ zone_type: z.string(), description: z.string() });

export const metaSchema = z.object({
  data_as_of: isoDate,
  history_start: isoDate,
  forecast_horizon_days: z.number(),
  horizons: z.object({ history_days: z.array(z.number()), forecast_days: z.array(z.number()) }),
  default_plan_days: z.number(),
  max_strategies_per_plan: z.number(),
  categories: z.array(categorySchema),
  zones: z.array(zoneSchema),
  demo_mode: z.boolean(),
});

export const productSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  brand: z.string(),
  unit: z.string(),
  retail_price: money,
  shelf_life_days: z.number(),
  is_seasonal: z.number(),
  weather_sensitivity: z.string(),
  base_daily_demand: z.number(),
  default_supplier: z.object({ supplier_id: z.string(), unit_cost: money, min_order_qty: z.number() }),
});

export const supplierSchema = z.object({
  supplier_id: z.string(),
  supplier_name: z.string(),
  email: z.string(),
  city: z.string(),
  categories_served: z.array(z.string()),
  reliability_score: fraction, // on-time probability, shown as "Puntualidad"
  offers_count: z.number(),
});

export const supplierOfferSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  unit_cost: money,
  min_order_qty: z.number(),
  lead_time_days: z.number(),
  delivery_days: z.string(), // "Tue|Fri"
  retail_price: money,
});

export const itemsOf = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

export const pageOf =<T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), page: z.number(), page_size: z.number(), total: z.number() });

/* ---------- dashboard ---------- */

export const kpiSetSchema = z.object({
  average_ticket: money,
  average_ticket_delta_pct: z.number(),
  items_per_ticket: z.number(),
  items_per_ticket_delta_pct: z.number(),
  stockout_products: z.number(),
  no_demand_products: z.number(),
  ai_opportunity_mxn: money,
});

export const chainSummarySchema = z.object({
  period,
  mode: z.enum(["actual", "forecast"]),
  kpis: kpiSetSchema,
  portfolio_impact: z.object({
    net_expected_margin_increment: money,
    confidence_interval: ci,
    stores_with_plan: z.number(),
    strategies_count: z.number(),
  }),
  store_ranking: z.array(
    z.object({
      store_id: z.string(),
      colonia: z.string(),
      zone_type: z.string(),
      opportunity_mxn: money,
      strategies_count: z.number(),
    }),
  ),
});

export const storeKpisSchema = z.object({
  store_id: z.string(),
  period,
  mode: z.enum(["actual", "forecast"]),
  kpis: kpiSetSchema,
});

export const heatSchema = z.object({
  product_id: z.string().nullable(),
  metric: z.string(),
  items: z.array(z.object({ store_id: z.string(), movement: z.number(), units: z.number(), is_top: z.boolean() })),
});

export const behaviorSchema = z.object({
  id: z.string(),
  kind: z.enum(["crosssell", "waste", "demand"]),
  source: z.enum(["observed", "estimated"]),
  title: z.string(),
  text: z.string(),
  product_id: z.string(),
  related_product_id: z.string().nullable(),
  affinity: z
    .object({
      observed_ticket_share: z.number().nullable(),
      estimated_ticket_share: z.number().nullable(),
      lift: z.number().nullable(),
      tickets_sample: z.number().nullable(),
    })
    .nullable(),
  estimated_gain_mxn: money,
});

/* ---------- trends ---------- */

export const tendencySchema = z.object({
  store_id: z.string(),
  product_id: z.string(),
  history: z.array(z.object({ date: isoDate, value: z.number() })),
  forecast: z.array(z.object({ date: isoDate, value: z.number(), p50: z.number(), p80: z.number(), p90: z.number() })),
  treated: z.array(z.object({ date: isoDate, value: z.number() })).nullable(),
  drivers: z.array(z.string()),
  risks: z.array(z.object({ code: z.string(), message: z.string() })),
  ai_summary: z.string().nullable(),
});

/* ---------- stock ---------- */

export const stockStatusSchema = z.enum(["out", "low", "ok", "over"]);

export const stockItemSchema = z.object({
  store_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  closing_qty: z.number(),
  on_order_qty: z.number(),
  in_transit: z.array(
    z.object({
      order_id: z.string(),
      quantity: z.number(),
      supplier_id: z.string(),
      expected_delivery_date: isoDate,
      is_delayed: z.boolean(),
    }),
  ),
  reorder_point: z.number(),
  max_stock: z.number(),
  coverage_days: z.number(),
  status: stockStatusSchema,
  earliest_expiry: isoDate.nullable(),
  expiring_qty_7d: z.number(),
  lost_demand_7d: z.number(),
  next_restock_date: isoDate.nullable(),
});

export const stockSummarySchema = z.object({
  total: z.number(),
  out: z.number(),
  low: z.number(),
  ok: z.number(),
  over: z.number(),
});

export const policyItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  category_id: z.string(),
  unit_cost: money,
  retail_price: money,
  min_order_qty: z.number(),
  shelf_life_days: z.number(),
  reorder_point: z.number(),
  max_stock: z.number(),
  updated_at: z.string().nullable(),
});

export const policyPageSchema = pageOf(policyItemSchema).extend({ store_id: z.string() });

export const policySuggestionSchema = z.object({
  store_id: z.string(),
  items: z.array(
    z.object({
      product_id: z.string(),
      current: z.object({ reorder_point: z.number(), max_stock: z.number() }),
      suggested: z.object({ reorder_point: z.number(), max_stock: z.number() }),
      reason: z.string(),
    }),
  ),
});

/* ---------- restock ---------- */

export const restockReasonSchema = z.enum(["below_min", "demand_spike", "stockout", "expiry", "season"]);

const supplierChoice = z.object({
  supplier_id: z.string(),
  supplier_name: z.string(),
  unit_cost: money,
  min_order_qty: z.number(),
  lead_time_days: z.number(),
  expected_delivery_date: isoDate,
  suggested_qty: z.number(),
  estimated_cost: money,
});

export const restockSuggestionSchema = z.object({
  id: z.string(),
  store_id: z.string(),
  product_id: z.string(),
  order_date: isoDate,
  expected_delivery_date: isoDate,
  is_urgent: z.boolean(),
  reasons: z.array(restockReasonSchema),
  suggested_qty: z.number(),
  estimated_cost: money,
  stock_at_order: z.number(),
  predicted_daily_demand: z.number(),
  supplier: z.object({
    supplier_id: z.string(),
    supplier_name: z.string(),
    email: z.string(),
    unit_cost: money,
    min_order_qty: z.number(),
    lead_time_days: z.number(),
    delivery_days: z.string(),
    reliability_score: fraction,
  }),
  alternatives: z.array(supplierChoice),
  expected_lost_sales_if_skipped: money,
  expected_gain_if_ordered: money,
  expected_waste_if_ordered: money,
  /** Set by the backend once an order for this suggestion was sent. */
  order_status: z.enum(["pending", "sent"]).optional(),
});

export const restockOrderSchema = z.object({
  order_id: z.string(),
  suggestion_id: z.string(),
  store_id: z.string(),
  product_id: z.string(),
  supplier_id: z.string(),
  qty: z.number(),
  unit_cost: money,
  estimated_cost: money,
  order_date: isoDate,
  expected_delivery_date: isoDate,
  status: z.literal("sent"),
  sent_at: z.string(),
  email: z.object({ to: z.string(), subject: z.string(), provider_message_id: z.string() }),
  demo_redirect: z.boolean(),
});

export const testEmailSchema = z.object({
  supplier_id: z.string(),
  status: z.literal("sent"),
  sent_at: z.string(),
  email: z.object({ to: z.string() }),
  demo_redirect: z.boolean(),
});

/* ---------- calendar ---------- */

export const calendarEventSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(), date: isoDate, kind: z.literal("delivery"), label_code: z.string(),
    product_id: z.string(), supplier_id: z.string(), order_id: z.string(), qty: z.number(),
  }),
  z.object({
    id: z.string(), date: isoDate, kind: z.literal("strategy"), strategy_id: z.string(),
    status: z.string(), strategy_type: z.string(), start_date: isoDate, end_date: isoDate,
  }),
  z.object({
    id: z.string(), date: isoDate, kind: z.literal("alert"),
    alert_type: z.enum(["stockout_risk", "expiring_soon", "order_delayed"]),
    product_id: z.string(),
    severity: z.string().optional(),
    qty: z.number().optional(),
    order_id: z.string().optional(),
    expected_delivery_date: isoDate.optional(),
    delay_days: z.number().optional(),
  }),
]);

export const calendarContextSchema = z.object({
  date: isoDate,
  day_of_week: z.string(),
  is_holiday: z.number(),
  holiday_name: z.string().nullable(),
  event_name: z.string().nullable(), // may hold several values separated by "|"
  event_scope: z.string().nullable(),
  is_payday: z.number(),
  is_school_vacation: z.number(),
  is_college_vacation: z.number(),
  temp_max_c: z.number(),
  temp_min_c: z.number(),
  precipitation_mm: z.number(),
  weather_label: z.string(),
  is_forecast: z.boolean(),
});

export const calendarSchema = z.object({
  store_id: z.string(),
  from: isoDate,
  to: isoDate,
  events: z.array(calendarEventSchema),
  context: z.array(calendarContextSchema),
});

/* ---------- strategies & plan ---------- */

export const strategyStatusSchema = z.enum(["draft", "selected", "approved", "scheduled", "active", "measured", "expired", "rejected"]);
export const strategyTypeSchema = z.enum(["affinity_combo", "rescue_bundle", "contextual_offer"]);
export const strategyDriverSchema = z.enum(["demand", "weather", "event", "season", "shelf_life", "bought_together"]);

const scenario = z.object({
  units: z.number(),
  net_revenue: money,
  margin: money,
  waste_units: z.number(),
  waste_cost: money,
  stockout_risk: fraction,
});

export const strategySchema = z.object({
  draft_id: z.string(),
  store_id: z.string(),
  status: strategyStatusSchema,
  strategy_type: strategyTypeSchema,
  title: z.string(),
  anchor_product_id: z.string().nullable(),
  promoted_product_id: z.string(),
  period: z.object({ start_date: isoDate, end_date: isoDate }),
  proposed_discount_pct: fraction,
  constraints: z.object({
    min_margin_pct: z.number().nullable(),
    max_discount_pct: z.number().nullable(),
    budget_mxn: money.nullable(),
    satisfied: z.boolean(),
    // The Go backend serializes an empty violation list as null in one edge case; it means "none".
    violations: z
      .array(z.object({ code: z.string(), message: z.string(), limit: z.number().optional(), actual: z.number().optional() }))
      .nullable()
      .transform((v) => v ?? []),
  }),
  assumptions: z.array(z.string()),
  baseline: scenario,
  treated: scenario,
  expected_units_increment: z.number(),
  expected_sales_increment: money,
  expected_margin_increment: money,
  expected_waste_reduction: money,
  confidence_interval: ci,
  explanation: z.string(),
  drivers: z.array(strategyDriverSchema),
  created_at: z.string(),
  approved_at: z.string().nullable(),
  measurement: z
    .object({
      measured_at: z.string(),
      actual: z.object({ units: z.number(), net_revenue: money, margin: money, waste_units: z.number() }),
      actual_margin_increment: money,
      control_group_used: z.boolean(),
    })
    .nullable(),
  requires_approval: z.boolean(),
});

export const portfolioSchema = z.object({
  net_expected_margin_increment: money,
  confidence_interval: ci,
  conflicts: z.array(
    z.object({ strategy_ids: z.array(z.string()), type: z.string(), description: z.string(), resolution: z.string() }),
  ),
});

export const planSchema = z.object({
  store_id: z.string(),
  period,
  generated_at: z.string(),
  strategies: z.array(strategySchema),
  portfolio: portfolioSchema,
  reason_if_fewer: z.string().nullable(),
});

export const strategyActionSchema = z.object({ strategy: strategySchema, portfolio: portfolioSchema });

/* ---------- chat (GenUI) ---------- */

export const chatToolSchema = z.object({ name: z.string(), args: z.record(z.string(), z.unknown()) });

/** A strategy already in the plan that overlaps the proposal (plan_summary.overlaps of POST /chat). */
export const planOverlapSchema = z.object({
  draft_id: z.string(),
  product_id: z.string(),
  start_date: isoDate,
  end_date: isoDate,
  type: z.string(), // "overlapping_product" today; translated with t("overlapType", …)
});

export const chatBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("forecast_chart"),
    store_id: z.string(),
    product_id: z.string(),
    history: z.array(z.object({ date: isoDate, value: z.number() })),
    forecast: z.array(z.object({ date: isoDate, value: z.number(), p50: z.number(), p80: z.number(), p90: z.number() })),
    treated: z.array(z.object({ date: isoDate, value: z.number() })).optional(),
  }),
  z.object({ type: z.literal("strategy_card"), strategy: strategySchema, requires_approval: z.boolean() }),
  z.object({
    type: z.literal("plan_summary"),
    current_net_expected_margin_increment: money,
    with_draft_net_expected_margin_increment: money,
    delta: money,
    overlaps: z.array(planOverlapSchema),
  }),
  z.object({ type: z.literal("restock_table"), suggestions: z.array(restockSuggestionSchema) }),
  z.object({
    type: z.literal("market_comparison"),
    provider: z.literal("brave"),
    query: z.string(),
    searched_at: z.string(),
    items: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        source: z.string(),
        description: z.string(),
        price_text: z.string().nullable().optional(),
      }),
    ).max(8),
  }),
]);

export const chatResponseSchema = z.object({
  conversation_id: z.string(),
  message_id: z.string(),
  /** Optional scope selected by a chain-level analysis so the UI can continue with that store and product. */
  focus_store_id: z.string().nullable().optional(),
  focus_product_id: z.string().nullable().optional(),
  tools: z.array(chatToolSchema),
  interpreted_constraints: z
    .object({
      product_ids: z.array(z.string()),
      category_id: z.string().nullable(),
      weekday: z.string().nullable(),
      max_discount_pct: z.number().nullable(),
    })
    .nullable(),
  // Blocks are parsed one by one in the chat code so one unknown block does not discard the whole reply.
  blocks: z.array(z.unknown()),
});

/* ---------- auth ---------- */

export const sessionSchema = z.object({
  token: z.string(),
  expires_at: z.string().optional(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});
